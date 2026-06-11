from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.api.auth import get_current_user, get_db
from app.schemas.subscription import (
    CancelSubscription,
    ChangeSubscription,
    PaymentMethod,
    PlanInfo,
    PurchaseSubscription,
    SubscriptionOut,
)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

PLANS = {
    "Starter": {"price": 89.99, "credits": 10, "description": "10 kahve hakki"},
    "Premium": {"price": 149.99, "credits": 20, "description": "20 kahve hakki"},
    "Unlimited": {"price": 249.99, "credits": -1, "description": "Sinirsiz kahve"},
}


def simulate_payment(method: PaymentMethod) -> bool:
    normalized = method.card_number.replace(" ", "").replace("-", "")
    return normalized in {"4242424242424242", "4111111111111111"}


@router.get("/plans", response_model=list[PlanInfo])
def list_plans():
    return [
        PlanInfo(
            name=name,
            price=data["price"],
            credits=data["credits"],
            description=data["description"],
        )
        for name, data in PLANS.items()
    ]


@router.post("/purchase", response_model=SubscriptionOut)
def purchase_subscription(
    payload: PurchaseSubscription,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = payload.plan
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not simulate_payment(payload.payment_method):
        raise HTTPException(status_code=400, detail="Payment failed")

    plan_info = PLANS[plan]
    now = datetime.utcnow()
    end_date = now + timedelta(days=30)
    remaining = plan_info["credits"]
    subscription = db.query(models.Subscription).filter_by(user_id=user.id, active=True).first()

    if subscription:
        subscription.plan = plan
        subscription.start_date = now
        subscription.end_date = end_date
        subscription.active = True
        subscription.remaining_credits = remaining
        db.add(subscription)
    else:
        subscription = models.Subscription(
            user_id=user.id,
            plan=plan,
            start_date=now,
            end_date=end_date,
            active=True,
            remaining_credits=remaining,
        )
        db.add(subscription)

    db.commit()
    db.refresh(subscription)
    return subscription


@router.get("/me", response_model=SubscriptionOut)
def get_my_subscription(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subscription = db.query(models.Subscription).filter_by(user_id=user.id, active=True).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    return subscription


@router.post("/switch", response_model=SubscriptionOut)
def change_subscription(
    payload: ChangeSubscription,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = payload.plan
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not simulate_payment(payload.payment_method):
        raise HTTPException(status_code=400, detail="Payment failed")

    subscription = db.query(models.Subscription).filter_by(user_id=user.id, active=True).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription to switch")

    now = datetime.utcnow()
    subscription.plan = plan
    subscription.start_date = now
    subscription.end_date = now + timedelta(days=30)
    subscription.remaining_credits = PLANS[plan]["credits"]
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/use", response_model=SubscriptionOut)
def use_subscription(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subscription = db.query(models.Subscription).filter_by(user_id=user.id, active=True).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    if subscription.end_date and subscription.end_date < datetime.utcnow():
        subscription.active = False
        db.add(subscription)
        db.commit()
        raise HTTPException(status_code=400, detail="Subscription has expired")
    if subscription.remaining_credits == 0:
        raise HTTPException(status_code=400, detail="No remaining coffee credits")
    if subscription.remaining_credits > 0:
        subscription.remaining_credits -= 1
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/cancel", response_model=dict)
def cancel_subscription(
    payload: CancelSubscription,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.confirm:
        raise HTTPException(status_code=400, detail="Cancellation not confirmed")
    subscription = db.query(models.Subscription).filter_by(user_id=user.id, active=True).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription to cancel")
    subscription.active = False
    db.add(subscription)
    db.commit()
    return {"detail": "Subscription cancelled"}
