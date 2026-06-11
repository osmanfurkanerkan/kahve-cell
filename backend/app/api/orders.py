import hashlib
import hmac
import json
import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.auth import get_current_user
from app.db import SessionLocal
from app.schemas.orders import OrderCreate, OrderOut, OrderStatusUpdate, QRVerifyRequest

router = APIRouter(prefix="/orders", tags=["orders"])

QR_SECRET = os.getenv("QR_SECRET_KEY", "kahvecell-secret-key-2026")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_qr_signature(order_id: int, user_id: int, shop_id: int, created_at: str) -> str:
    payload = f"{order_id}:{user_id}:{shop_id}:{created_at}"
    return hmac.new(QR_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


def verify_qr_signature(order_id: int, user_id: int, shop_id: int, created_at: str, signature: str) -> bool:
    expected = generate_qr_signature(order_id, user_id, shop_id, created_at)
    return hmac.compare_digest(expected, signature)


def serialize_order(order: models.Order) -> dict:
    customizations = None
    if order.customizations:
        try:
            customizations = json.loads(order.customizations)
        except json.JSONDecodeError:
            customizations = None

    return {
        "id": order.id,
        "user_id": order.user_id,
        "shop_id": order.shop_id,
        "product_id": order.product_id,
        "quantity": order.quantity,
        "total_cents": order.total_cents,
        "status": order.status,
        "customizations": customizations,
        "qr_code": order.qr_code,
        "qr_verified": order.qr_verified,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "user_name": order.user.name if order.user else None,
        "user_phone": order.user.phone if order.user else None,
        "product_name": order.product.name if order.product else None,
        "shop_name": order.shop.name if order.shop else None,
    }


@router.post("/", response_model=OrderOut)
def create_order(
    payload: OrderCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subscription = db.query(models.Subscription).filter_by(user_id=user.id, active=True).first()

    if not subscription:
        raise HTTPException(status_code=400, detail="Aktif abonelik bulunamadi. Once paket satin alin.")
    if subscription.end_date and subscription.end_date < datetime.utcnow():
        subscription.active = False
        db.add(subscription)
        db.commit()
        raise HTTPException(status_code=400, detail="Abonelik suresi dolmuş.")
    if subscription.plan != "Unlimited" and subscription.remaining_credits <= 0:
        raise HTTPException(status_code=400, detail="Kahve hakkın bitmis. Yeni paket satin alin.")

    product = db.query(models.Product).filter_by(id=payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Urun bulunamadi.")

    shop = db.query(models.Shop).filter_by(id=payload.shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Dukkan bulunamadi.")

    customizations_json = None
    if payload.customizations:
        customizations_json = json.dumps(payload.customizations.dict())

    order = models.Order(
        user_id=user.id,
        shop_id=payload.shop_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        total_cents=product.price_cents * payload.quantity,
        status="pending",
        customizations=customizations_json,
    )

    db.add(order)
    db.flush()

    created_at_iso = datetime.utcnow().isoformat()
    signature = generate_qr_signature(order.id, user.id, payload.shop_id, created_at_iso)
    qr_payload = {
        "order_id": order.id,
        "user_id": user.id,
        "shop_id": payload.shop_id,
        "created_at": created_at_iso,
        "signature": signature,
    }
    order.qr_code = json.dumps(qr_payload)

    if subscription.plan != "Unlimited":
        subscription.remaining_credits -= 1

    db.add(subscription)
    db.add(order)
    db.commit()
    db.refresh(order)
    return serialize_order(order)


# IMPORTANT: specific routes must come BEFORE parameterized /{order_id} routes

@router.get("/user/history", response_model=List[OrderOut])
def get_order_history(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = (
        db.query(models.Order)
        .filter_by(user_id=user.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )
    return [serialize_order(order) for order in orders]


@router.get("/shop/{shop_id}/pending", response_model=List[OrderOut])
def get_pending_orders_for_shop(
    shop_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "shop_owner" and user.role != "admin":
        raise HTTPException(status_code=403, detail="Sadece dukkan sahipleri erisebilir.")
    orders = (
        db.query(models.Order)
        .filter(
            models.Order.shop_id == shop_id,
            models.Order.status.in_(["pending", "accepted", "preparing", "ready"]),
        )
        .order_by(models.Order.created_at)
        .all()
    )
    return [serialize_order(order) for order in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Siparis bulunamadi.")
    is_owner = order.user_id == user.id
    is_shop_owner = user.role in ("shop_owner", "admin")
    if not is_owner and not is_shop_owner:
        raise HTTPException(status_code=403, detail="Bu siparisi goruntuleme yetkiniz yok.")
    return serialize_order(order)


@router.patch("/{order_id}", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Siparis bulunamadi.")

    valid_statuses = ["pending", "accepted", "preparing", "ready", "delivered"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Gecersiz durum.")

    status_order = {"pending": 0, "accepted": 1, "preparing": 2, "ready": 3, "delivered": 4}
    current_index = status_order.get(order.status, -1)
    new_index = status_order.get(payload.status, -1)
    if new_index < current_index:
        raise HTTPException(status_code=400, detail="Siparis durumu geriye alinamamaz.")

    order.status = payload.status
    order.updated_at = datetime.utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)
    return serialize_order(order)


@router.post("/{order_id}/verify-qr", response_model=dict)
def verify_qr_code(
    order_id: int,
    payload: QRVerifyRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(models.Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Siparis bulunamadi.")

    try:
        qr_data = json.loads(payload.qr_code_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Gecersiz QR kod formati.")

    is_valid = verify_qr_signature(
        qr_data.get("order_id"),
        qr_data.get("user_id"),
        qr_data.get("shop_id"),
        qr_data.get("created_at"),
        qr_data.get("signature", ""),
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="QR kod imzasi gecersiz.")
    if qr_data.get("order_id") != order.id:
        raise HTTPException(status_code=400, detail="QR kod siparis ID uyusmazligi.")

    order.qr_verified = True
    db.add(order)
    db.commit()
    return {"valid": True, "message": "QR kod dogrulandi."}
