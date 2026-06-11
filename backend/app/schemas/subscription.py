from datetime import datetime
from pydantic import BaseModel
from pydantic import ConfigDict
from typing import Optional


class PaymentMethod(BaseModel):
    card_number: str
    card_holder: str
    expiry_month: int
    expiry_year: int
    cvv: str


class PurchaseSubscription(BaseModel):
    plan: str
    payment_method: PaymentMethod


class ChangeSubscription(BaseModel):
    plan: str
    payment_method: PaymentMethod


class CancelSubscription(BaseModel):
    confirm: bool = True


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan: str
    active: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    remaining_credits: int


class PlanInfo(BaseModel):
    name: str
    price: float
    credits: Optional[int] = None
    description: str
