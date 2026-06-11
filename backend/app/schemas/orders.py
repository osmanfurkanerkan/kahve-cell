from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel
from pydantic import ConfigDict


class OrderCustomizations(BaseModel):
    size: str = "M"
    sugar: int = 1
    milk: str = "normal"
    extras: List[str] = []


class OrderCreate(BaseModel):
    shop_id: int
    product_id: int
    quantity: int = 1
    customizations: Optional[OrderCustomizations] = None


class OrderStatusUpdate(BaseModel):
    status: str


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    shop_id: int
    product_id: Optional[int] = None
    quantity: int
    total_cents: int
    status: str
    customizations: Optional[Dict[str, Any]] = None
    qr_code: Optional[str] = None
    qr_verified: bool
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    product_name: Optional[str] = None
    shop_name: Optional[str] = None


class QRCodePayload(BaseModel):
    order_id: int
    user_id: int
    shop_id: int
    created_at: str
    signature: str


class QRVerifyRequest(BaseModel):
    qr_code_json: str
