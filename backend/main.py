from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.db import engine
import sqlite3
from sqlalchemy import text

from app.api import auth as auth_router
from app.api import subscriptions as subscriptions_router
from app.api import shops as shops_router
from app.api import orders as orders_router

app = FastAPI(title="KahveCell Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _add_column_if_missing(conn, table: str, col: str, definition: str):
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info('{table}')")
    existing = [r[1] for r in cur.fetchall()]
    if col not in existing:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
        conn.commit()
        print(f"[migration] Added {table}.{col}")


@app.on_event("startup")
def on_startup():
    models.Base.metadata.create_all(bind=engine)

    db_path = str(engine.url).replace('sqlite:///', '')
    # On Windows the path starts without leading slash
    if db_path.startswith('/') and db_path[2] == ':':
        db_path = db_path[1:]

    conn = sqlite3.connect(db_path)

    # users migrations
    _add_column_if_missing(conn, "users", "role", "TEXT DEFAULT 'customer'")
    _add_column_if_missing(conn, "users", "otp_code", "TEXT")
    _add_column_if_missing(conn, "users", "otp_expires", "TEXT")
    _add_column_if_missing(conn, "users", "hashed_password", "TEXT")

    # orders migrations
    _add_column_if_missing(conn, "orders", "customizations", "TEXT")
    _add_column_if_missing(conn, "orders", "qr_code", "TEXT")
    _add_column_if_missing(conn, "orders", "qr_verified", "INTEGER DEFAULT 0")
    _add_column_if_missing(conn, "orders", "updated_at", "TIMESTAMP")

    conn.close()


@app.get("/")
async def read_root():
    return {"message": "çalışıyor"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# include routers
app.include_router(auth_router.router)
app.include_router(subscriptions_router.router)
app.include_router(shops_router.router)
app.include_router(orders_router.router)
