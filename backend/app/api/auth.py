from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta, timezone

from app.db import SessionLocal, engine
from app import models
from app.schemas.auth import RequestOTP, VerifyOTP, Token, UserOut
from app.core.security import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> models.User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    token = parts[1]
    data = decode_token(token)
    if not data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = data.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(models.User).filter_by(id=int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/request-otp", status_code=200)
def request_otp(payload: RequestOTP, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(phone=payload.phone).first()
    if not user:
        user = models.User(phone=payload.phone, name=payload.name)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif payload.name and not user.name:
        user.name = payload.name
        db.add(user)
        db.commit()

    code = "1234"
    expires = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
    db.execute(
        text("UPDATE users SET otp_code = :code, otp_expires = :exp WHERE id = :id"),
        {"code": code, "exp": expires, "id": user.id},
    )
    db.commit()
    print(f"[OTP] Phone={payload.phone} Code={code}")
    return {"message": "OTP sent (simulated)", "code": code}


@router.post("/verify-otp", response_model=Token)
def verify_otp(payload: VerifyOTP, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(phone=payload.phone).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    cur = db.execute(text("SELECT otp_code, otp_expires FROM users WHERE id = :id"), {"id": user.id})
    row = cur.fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=400, detail="No OTP requested")

    otp_code, otp_expires_str = row[0], row[1]
    if otp_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    try:
        expires_dt = datetime.fromisoformat(otp_expires_str)
        now = datetime.now(timezone.utc)
        if expires_dt.tzinfo is None:
            expires_dt = expires_dt.replace(tzinfo=timezone.utc)
        if expires_dt < now:
            raise HTTPException(status_code=400, detail="OTP expired")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid OTP expiry format")

    access = create_access_token(subject=str(user.id))
    refresh = create_refresh_token(subject=str(user.id))

    db.execute(text("UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = :id"), {"id": user.id})
    db.commit()

    return Token(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=Token)
def refresh_token(body: Token, db: Session = Depends(get_db)):
    if not body.refresh_token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    data = decode_token(body.refresh_token)
    if not data:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = data.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(models.User).filter_by(id=int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    access = create_access_token(subject=str(user.id))
    return Token(access_token=access, refresh_token=body.refresh_token)


@router.get("/me", response_model=UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user
