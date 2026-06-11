from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from math import radians, cos, sin, asin, sqrt
from typing import List

from app.db import SessionLocal
from app import models
from app.schemas.shops import (
    ShopOut,
    ShopDetail,
    ProductOut,
    ShopWithDistance,
    NearbyRequest,
    SearchRequest,
)

router = APIRouter(prefix="/shops", tags=["shops"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    Returns distance in kilometers.
    """
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    km = 6371 * c
    return km


@router.get("/", response_model=List[ShopOut])
def list_shops(db: Session = Depends(get_db)):
    """List all shops"""
    shops = db.query(models.Shop).all()
    return shops


@router.get("/nearby", response_model=List[ShopWithDistance])
def nearby_shops(lat: float, lng: float, radius_km: float = 5.0, db: Session = Depends(get_db)):
    """
    Get shops nearby a given location, sorted by distance.
    Parameters:
      - lat: User latitude (e.g., 39.92077 for Ankara Kızılay)
      - lng: User longitude (e.g., 32.85411 for Ankara Kızılay)
      - radius_km: Search radius in kilometers (default 5)
    """
    shops = db.query(models.Shop).all()
    
    nearby = []
    for shop in shops:
        if shop.lat and shop.lng:
            distance = haversine(lat, lng, shop.lat, shop.lng)
            if distance <= radius_km:
                nearby.append({
                    "id": shop.id,
                    "name": shop.name,
                    "address": shop.address,
                    "lat": shop.lat,
                    "lng": shop.lng,
                    "phone": shop.phone,
                    "distance_km": round(distance, 2)
                })
    
    # Sort by distance
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


@router.get("/search", response_model=List[ShopOut])
def search_shops(query: str, db: Session = Depends(get_db)):
    """
    Search shops by name or address.
    Parameters:
      - query: Search keyword (name or address)
    """
    shops = db.query(models.Shop).filter(
        (models.Shop.name.ilike(f"%{query}%")) |
        (models.Shop.address.ilike(f"%{query}%"))
    ).all()
    return shops


@router.get("/{shop_id}", response_model=ShopDetail)
def get_shop_detail(shop_id: int, db: Session = Depends(get_db)):
    """
    Get shop details including menu (products).
    Parameters:
      - shop_id: Shop ID
    """
    shop = db.query(models.Shop).filter_by(id=shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    
    return {
        "id": shop.id,
        "name": shop.name,
        "address": shop.address,
        "lat": shop.lat,
        "lng": shop.lng,
        "phone": shop.phone,
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "price_cents": p.price_cents
            }
            for p in shop.products
        ]
    }
