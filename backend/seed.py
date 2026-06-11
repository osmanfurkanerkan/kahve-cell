from datetime import datetime, timedelta
import sqlite3
import hashlib
from sqlalchemy import text

from app import models
from app.db import engine, SessionLocal


def ensure_hashed_password_column(db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info('users')")
    cols = [r[1] for r in cur.fetchall()]
    if 'hashed_password' not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN hashed_password TEXT")
        conn.commit()
        print('Added hashed_password column to users table')
    conn.close()


def seed_all():
    # ensure tables exist
    models.Base.metadata.create_all(bind=engine)

    # path to sqlite file
    db_file = str(engine.url).replace('sqlite:///', '')
    ensure_hashed_password_column(db_file)

    session = SessionLocal()
    try:
        # Create test user
        phone = "+905551234567"
        password = "kahve123"
        user = session.query(models.User).filter_by(phone=phone).first()
        if not user:
            user = models.User(phone=phone, name="Test Kullanıcı")
            session.add(user)
            session.flush()
            hashed = hashlib.sha256(password.encode('utf-8')).hexdigest()
            # update hashed_password column
            session.execute(
                text("UPDATE users SET hashed_password = :hp WHERE id = :id"),
                {"hp": hashed, "id": user.id},
            )
            session.commit()
            print(f'Created user {phone} with password "{password}"')
        else:
            print('User already exists')

        # Add Starter subscription
        sub = session.query(models.Subscription).filter_by(user_id=user.id).first()
        if not sub:
            start = datetime.utcnow()
            end = start + timedelta(days=30)
            sub = models.Subscription(
                user_id=user.id,
                plan="Starter",
                start_date=start,
                end_date=end,
                active=True,
                remaining_credits=8,
            )
            session.add(sub)
            session.commit()
            print('Added Starter subscription (8 credits)')
        else:
            print('Subscription already exists')

        # Shops and products (Ankara)
        shops_data = [
            {
                "name": "Kızılay Kahve",
                "address": "Kızılay, Ankara",
                "lat": 39.92077,
                "lng": 32.85411,
                "products": [
                    ("Espresso", "Yoğun shot", 2500),
                    ("Cappuccino", "Sütlü köpüklü", 3200),
                    ("Türk Kahvesi", "Geleneksel", 2200),
                ],
            },
            {
                "name": "Çankaya Coffee",
                "address": "Çankaya, Ankara",
                "lat": 39.91886,
                "lng": 32.85902,
                "products": [
                    ("Espresso", "Yoğun shot", 2400),
                    ("Latte", "Sütlü kahve", 3500),
                    ("Türk Kahvesi", "Klasik", 2100),
                ],
            },
            {
                "name": "Bahçelievler Beans",
                "address": "Bahçelievler, Ankara",
                "lat": 39.93345,
                "lng": 32.82414,
                "products": [
                    ("Espresso", "Küçük shot", 2300),
                    ("Cappuccino", "Köpüklü", 3000),
                    ("Mocha", "Çikolatalı latte", 3600),
                ],
            },
            {
                "name": "Çayyolu Brew",
                "address": "Çayyolu, Ankara",
                "lat": 39.92544,
                "lng": 32.74766,
                "products": [
                    ("Espresso", "Taze çekilmiş", 2600),
                    ("Latte", "Sütlü", 3400),
                    ("Türk Kahvesi", "Geleneksel", 2300),
                ],
            },
            {
                "name": "Ulus Espresso",
                "address": "Ulus, Ankara",
                "lat": 39.94168,
                "lng": 32.85833,
                "products": [
                    ("Espresso", "Sert shot", 2200),
                    ("Cappuccino", "Klasik", 3000),
                    ("Türk Kahvesi", "Tatlı", 2000),
                ],
            },
        ]

        # insert shops and products
        for s in shops_data:
            shop = session.query(models.Shop).filter_by(name=s['name']).first()
            if not shop:
                shop = models.Shop(name=s['name'], address=s['address'], lat=s['lat'], lng=s['lng'])
                session.add(shop)
                session.flush()
                for p in s['products']:
                    prod = models.Product(shop_id=shop.id, name=p[0], description=p[1], price_cents=p[2])
                    session.add(prod)
                session.commit()
                print(f"Added shop {s['name']} with {len(s['products'])} products")
            else:
                print(f"Shop {s['name']} already exists")

        # Create shop owner accounts
        shop_owners_data = [
            {
                "phone": "+905551234568",
                "name": "Kızılay Kahve Sahibi",
                "shop_id": 1,
            },
            {
                "phone": "+905551234569",
                "name": "Çankaya Coffee Sahibi",
                "shop_id": 2,
            },
        ]

        for owner_data in shop_owners_data:
            owner = session.query(models.User).filter_by(phone=owner_data['phone']).first()
            if not owner:
                owner = models.User(
                    phone=owner_data['phone'],
                    name=owner_data['name'],
                )
                session.add(owner)
                session.flush()
                session.execute(
                    text("UPDATE users SET role = :role WHERE id = :id"),
                    {"role": "shop_owner", "id": owner.id},
                )
                session.commit()
                print(f"Created shop owner {owner_data['phone']} for shop ID {owner_data['shop_id']}")
            else:
                print(f"Shop owner {owner_data['phone']} already exists")

    finally:
        session.close()


if __name__ == '__main__':
    seed_all()
    print('Seeding complete')