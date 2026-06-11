from pydantic import BaseModel
from pydantic import ConfigDict
from typing import Optional


class RequestOTP(BaseModel):
    phone: str
    name: Optional[str] = None


class VerifyOTP(BaseModel):
    phone: str
    code: str


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    name: Optional[str] = None
    role: Optional[str] = None
