"""LobiImo - Real Estate Marketplace API (Kinshasa)

Roles: client, owner (bailleur), admin
- Interest-based lead flow (admin mediates)
- Favorites
- Property CRUD (owner + admin)
- Commission tracking (rental = 1 month rent, sale = 10% of price)
- Payments: manual (admin marks paid) + Stripe checkout session
"""
from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

import bcrypt
import stripe
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.environ.get("JWT_EXPIRES_MINUTES", 10080))
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

stripe.api_key = STRIPE_API_KEY

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("lobiimo")

# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]
users_col = db.users
properties_col = db.properties
interests_col = db.interests
favorites_col = db.favorites
payments_col = db.payments


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Lifespan (seed admin + indexes)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    await users_col.create_index("email", unique=True)
    await properties_col.create_index("owner_id")
    await interests_col.create_index("client_id")
    await interests_col.create_index("property_id")
    await favorites_col.create_index([("client_id", 1), ("property_id", 1)], unique=True)

    existing = await users_col.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await users_col.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": ADMIN_EMAIL,
                "password": _hash_password(ADMIN_PASSWORD),
                "role": "admin",
                "name": ADMIN_NAME,
                "phone": "",
                "created_at": _now_iso(),
            }
        )
        logger.info("Admin account seeded (%s)", ADMIN_EMAIL)
    else:
        logger.info("Admin account already exists (%s)", ADMIN_EMAIL)
    yield
    mongo_client.close()


app = FastAPI(title="LobiImo API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
Role = Literal["client", "owner", "admin"]
TransactionType = Literal["location", "vente"]
InterestStatus = Literal["new", "contacted", "connected", "closed"]
PaymentStatus = Literal["pending", "paid", "cancelled"]
PaymentMethod = Literal["manual", "stripe"]


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    phone: Optional[str] = ""
    role: Role
    created_at: str


class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    phone: Optional[str] = ""
    role: Role


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class PropertyIn(BaseModel):
    title: str
    description: str
    type: TransactionType  # location | vente
    price: float  # USD monthly rent OR sale price
    commune: str
    quartier: str
    address: Optional[str] = ""
    bedrooms: int = 0
    bathrooms: int = 0
    surface: float = 0  # m2
    amenities: List[str] = []
    photos: List[str] = []  # base64 strings


class PropertyOut(PropertyIn):
    id: str
    owner_id: str
    owner_name: str
    owner_phone: Optional[str] = ""
    status: Literal["pending", "published", "rejected", "archived"]
    created_at: str


class InterestIn(BaseModel):
    property_id: str
    message: Optional[str] = ""


class InterestOut(BaseModel):
    id: str
    property_id: str
    property_title: str
    property_type: TransactionType
    property_price: float
    client_id: str
    client_name: str
    client_email: EmailStr
    client_phone: Optional[str] = ""
    owner_id: str
    owner_name: str
    owner_phone: Optional[str] = ""
    message: Optional[str] = ""
    status: InterestStatus
    admin_notes: Optional[str] = ""
    created_at: str


class InterestUpdate(BaseModel):
    status: Optional[InterestStatus] = None
    admin_notes: Optional[str] = None


class PropertyStatusUpdate(BaseModel):
    status: Literal["pending", "published", "rejected", "archived"]


class PaymentCreateManual(BaseModel):
    interest_id: str
    amount: Optional[float] = None
    notes: Optional[str] = ""


class PaymentCreateStripe(BaseModel):
    interest_id: str
    success_url: str
    cancel_url: str


class PaymentOut(BaseModel):
    id: str
    interest_id: str
    property_id: str
    property_title: str
    transaction_type: TransactionType
    base_price: float
    commission: float
    amount: float
    currency: str
    method: PaymentMethod
    status: PaymentStatus
    stripe_session_id: Optional[str] = ""
    stripe_url: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: str
    paid_at: Optional[str] = ""


class StatsOut(BaseModel):
    users_total: int
    clients: int
    owners: int
    properties_total: int
    properties_published: int
    properties_pending: int
    interests_total: int
    interests_new: int
    payments_paid: int
    revenue_total: float


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
security = HTTPBearer(auto_error=False)


def _create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
    user = await users_col.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Accès refusé")
        return user

    return _dep


def _public_user(u: dict) -> UserPublic:
    return UserPublic(
        id=u["id"],
        email=u["email"],
        name=u.get("name", ""),
        phone=u.get("phone", ""),
        role=u["role"],
        created_at=u.get("created_at", _now_iso()),
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
from fastapi import APIRouter

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"app": "LobiImo API", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "ok", "time": _now_iso()}


# ---- Auth ----------------------------------------------------------------
@api.post("/auth/register", response_model=AuthResponse)
async def register(data: RegisterInput):
    if data.role == "admin":
        raise HTTPException(status_code=400, detail="Rôle non autorisé")
    if await users_col.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": _hash_password(data.password),
        "name": data.name,
        "phone": data.phone or "",
        "role": data.role,
        "created_at": _now_iso(),
    }
    await users_col.insert_one(user)
    return AuthResponse(token=_create_token(user["id"], user["role"]), user=_public_user(user))


@api.post("/auth/login", response_model=AuthResponse)
async def login(data: LoginInput):
    user = await users_col.find_one({"email": data.email}, {"_id": 0})
    if not user or not _verify_password(data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Identifiants incorrects")
    return AuthResponse(token=_create_token(user["id"], user["role"]), user=_public_user(user))


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return _public_user(user)


# ---- Properties ----------------------------------------------------------
def _property_out(doc: dict) -> PropertyOut:
    return PropertyOut(**{k: v for k, v in doc.items() if k != "_id"})


@api.get("/properties/public", response_model=List[PropertyOut])
async def list_properties_public(
    type: Optional[TransactionType] = None,
    commune: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bedrooms: Optional[int] = None,
    q: Optional[str] = None,
):
    """Anonymous-safe browse — only published properties."""
    query: dict = {"status": "published"}
    if type:
        query["type"] = type
    if commune:
        query["commune"] = {"$regex": f"^{commune}$", "$options": "i"}
    if bedrooms is not None:
        query["bedrooms"] = {"$gte": bedrooms}
    if min_price is not None or max_price is not None:
        price_q: dict = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        query["price"] = price_q
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"quartier": {"$regex": q, "$options": "i"}},
            {"commune": {"$regex": q, "$options": "i"}},
        ]
    docs = await properties_col.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [_property_out(d) for d in docs]


@api.get("/properties/public/{property_id}", response_model=PropertyOut)
async def get_property_public(property_id: str):
    """Anonymous-safe detail — only if published."""
    doc = await properties_col.find_one(
        {"id": property_id, "status": "published"}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Propriété introuvable")
    return _property_out(doc)


@api.get("/properties", response_model=List[PropertyOut])
async def list_properties(
    type: Optional[TransactionType] = None,
    commune: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bedrooms: Optional[int] = None,
    q: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    # Non-admin sees only published properties (except for their own)
    if user["role"] == "admin":
        if status_filter:
            query["status"] = status_filter
    elif user["role"] == "owner":
        # Owners see published + their own
        query["$or"] = [{"status": "published"}, {"owner_id": user["id"]}]
    else:
        query["status"] = "published"

    if type:
        query["type"] = type
    if commune:
        query["commune"] = {"$regex": f"^{commune}$", "$options": "i"}
    if bedrooms is not None:
        query["bedrooms"] = {"$gte": bedrooms}
    if min_price is not None or max_price is not None:
        price_q: dict = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        query["price"] = price_q
    if q:
        query["$and"] = query.get("$and", []) + [
            {
                "$or": [
                    {"title": {"$regex": q, "$options": "i"}},
                    {"description": {"$regex": q, "$options": "i"}},
                    {"quartier": {"$regex": q, "$options": "i"}},
                    {"commune": {"$regex": q, "$options": "i"}},
                ]
            }
        ]
    cursor = properties_col.find(query, {"_id": 0}).sort("created_at", -1)
    docs = await cursor.to_list(500)
    return [_property_out(d) for d in docs]


@api.get("/properties/mine", response_model=List[PropertyOut])
async def my_properties(user: dict = Depends(require_roles("owner", "admin"))):
    cursor = properties_col.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    return [_property_out(d) for d in await cursor.to_list(500)]


@api.get("/properties/{property_id}", response_model=PropertyOut)
async def get_property(property_id: str, user: dict = Depends(get_current_user)):
    doc = await properties_col.find_one({"id": property_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Propriété introuvable")
    if doc["status"] != "published" and user["role"] not in ("admin",) and doc["owner_id"] != user["id"]:
        raise HTTPException(403, "Accès refusé")
    return _property_out(doc)


@api.post("/properties", response_model=PropertyOut)
async def create_property(
    data: PropertyIn, user: dict = Depends(require_roles("owner", "admin"))
):
    doc = {
        **data.model_dump(),
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "owner_name": user.get("name", ""),
        "owner_phone": user.get("phone", ""),
        # Owner listings start pending; admin listings auto-published
        "status": "published" if user["role"] == "admin" else "pending",
        "created_at": _now_iso(),
    }
    await properties_col.insert_one(doc)
    doc.pop("_id", None)
    return _property_out(doc)


@api.put("/properties/{property_id}", response_model=PropertyOut)
async def update_property(
    property_id: str, data: PropertyIn, user: dict = Depends(get_current_user)
):
    doc = await properties_col.find_one({"id": property_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Propriété introuvable")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(403, "Accès refusé")
    update = data.model_dump()
    # Editing puts it back to pending review (owner-side)
    if user["role"] != "admin":
        update["status"] = "pending"
    await properties_col.update_one({"id": property_id}, {"$set": update})
    updated = await properties_col.find_one({"id": property_id}, {"_id": 0})
    return _property_out(updated)


@api.patch("/properties/{property_id}/status", response_model=PropertyOut)
async def update_property_status(
    property_id: str,
    data: PropertyStatusUpdate,
    user: dict = Depends(require_roles("admin")),
):
    result = await properties_col.update_one({"id": property_id}, {"$set": {"status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(404, "Propriété introuvable")
    doc = await properties_col.find_one({"id": property_id}, {"_id": 0})
    return _property_out(doc)


@api.delete("/properties/{property_id}")
async def delete_property(property_id: str, user: dict = Depends(get_current_user)):
    doc = await properties_col.find_one({"id": property_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Propriété introuvable")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(403, "Accès refusé")
    await properties_col.delete_one({"id": property_id})
    return {"success": True}


# ---- Favorites -----------------------------------------------------------
@api.get("/favorites", response_model=List[PropertyOut])
async def list_favorites(user: dict = Depends(require_roles("client"))):
    favs = await favorites_col.find({"client_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [f["property_id"] for f in favs]
    if not ids:
        return []
    docs = await properties_col.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    return [_property_out(d) for d in docs]


@api.post("/favorites/{property_id}")
async def add_favorite(property_id: str, user: dict = Depends(require_roles("client"))):
    prop = await properties_col.find_one({"id": property_id})
    if not prop:
        raise HTTPException(404, "Propriété introuvable")
    try:
        await favorites_col.insert_one(
            {
                "id": str(uuid.uuid4()),
                "client_id": user["id"],
                "property_id": property_id,
                "created_at": _now_iso(),
            }
        )
    except Exception:
        pass  # already exists
    return {"success": True}


@api.delete("/favorites/{property_id}")
async def remove_favorite(property_id: str, user: dict = Depends(require_roles("client"))):
    await favorites_col.delete_one({"client_id": user["id"], "property_id": property_id})
    return {"success": True}


# ---- Interests -----------------------------------------------------------
async def _hydrate_interest(doc: dict) -> InterestOut:
    prop = await properties_col.find_one({"id": doc["property_id"]}, {"_id": 0}) or {}
    client = await users_col.find_one({"id": doc["client_id"]}, {"_id": 0}) or {}
    owner = await users_col.find_one({"id": doc.get("owner_id")}, {"_id": 0}) or {}
    return InterestOut(
        id=doc["id"],
        property_id=doc["property_id"],
        property_title=prop.get("title", "Propriété supprimée"),
        property_type=prop.get("type", "location"),
        property_price=prop.get("price", 0),
        client_id=doc["client_id"],
        client_name=client.get("name", ""),
        client_email=client.get("email", "unknown@lobiimo.cd"),
        client_phone=client.get("phone", ""),
        owner_id=doc.get("owner_id", ""),
        owner_name=owner.get("name", ""),
        owner_phone=owner.get("phone", ""),
        message=doc.get("message", ""),
        status=doc.get("status", "new"),
        admin_notes=doc.get("admin_notes", ""),
        created_at=doc.get("created_at", _now_iso()),
    )


@api.post("/interests", response_model=InterestOut)
async def create_interest(data: InterestIn, user: dict = Depends(require_roles("client"))):
    prop = await properties_col.find_one({"id": data.property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(404, "Propriété introuvable")
    existing = await interests_col.find_one(
        {"client_id": user["id"], "property_id": data.property_id, "status": {"$ne": "closed"}}
    )
    if existing:
        return await _hydrate_interest(existing)
    doc = {
        "id": str(uuid.uuid4()),
        "property_id": data.property_id,
        "client_id": user["id"],
        "owner_id": prop["owner_id"],
        "message": data.message or "",
        "status": "new",
        "admin_notes": "",
        "created_at": _now_iso(),
    }
    await interests_col.insert_one(doc)
    return await _hydrate_interest(doc)


@api.get("/interests", response_model=List[InterestOut])
async def list_interests(user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        query: dict = {}
    elif user["role"] == "client":
        query = {"client_id": user["id"]}
    else:  # owner
        query = {"owner_id": user["id"]}
    docs = await interests_col.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [await _hydrate_interest(d) for d in docs]


@api.patch("/interests/{interest_id}", response_model=InterestOut)
async def update_interest(
    interest_id: str, data: InterestUpdate, user: dict = Depends(require_roles("admin"))
):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Rien à modifier")
    result = await interests_col.update_one({"id": interest_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Intérêt introuvable")
    doc = await interests_col.find_one({"id": interest_id}, {"_id": 0})
    return await _hydrate_interest(doc)


# ---- Payments / Commissions --------------------------------------------
def _calculate_commission(prop_type: str, base_price: float) -> float:
    if prop_type == "location":
        return float(base_price)  # 1 month rent
    if prop_type == "vente":
        return round(float(base_price) * 0.10, 2)  # 10 %
    return 0.0


async def _payment_from_interest(interest_id: str) -> tuple[dict, dict]:
    interest = await interests_col.find_one({"id": interest_id}, {"_id": 0})
    if not interest:
        raise HTTPException(404, "Intérêt introuvable")
    prop = await properties_col.find_one({"id": interest["property_id"]}, {"_id": 0})
    if not prop:
        raise HTTPException(404, "Propriété introuvable")
    return interest, prop


@api.post("/payments/manual", response_model=PaymentOut)
async def payment_manual(
    data: PaymentCreateManual, user: dict = Depends(require_roles("admin"))
):
    interest, prop = await _payment_from_interest(data.interest_id)
    commission = _calculate_commission(prop["type"], prop["price"])
    amount = float(data.amount) if data.amount is not None else commission
    payment = {
        "id": str(uuid.uuid4()),
        "interest_id": interest["id"],
        "property_id": prop["id"],
        "property_title": prop.get("title", ""),
        "transaction_type": prop["type"],
        "base_price": prop["price"],
        "commission": commission,
        "amount": amount,
        "currency": "USD",
        "method": "manual",
        "status": "paid",
        "stripe_session_id": "",
        "stripe_url": "",
        "notes": data.notes or "",
        "created_at": _now_iso(),
        "paid_at": _now_iso(),
    }
    await payments_col.insert_one(payment)
    await interests_col.update_one({"id": interest["id"]}, {"$set": {"status": "closed"}})
    payment.pop("_id", None)
    return PaymentOut(**payment)


@api.post("/payments/stripe", response_model=PaymentOut)
async def payment_stripe(
    data: PaymentCreateStripe, user: dict = Depends(require_roles("admin"))
):
    interest, prop = await _payment_from_interest(data.interest_id)
    commission = _calculate_commission(prop["type"], prop["price"])
    amount_cents = int(round(commission * 100))
    session_id = ""
    session_url = ""
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"Commission LobiImo - {prop.get('title','')}",
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=data.success_url,
            cancel_url=data.cancel_url,
            metadata={
                "interest_id": interest["id"],
                "property_id": prop["id"],
                "transaction_type": prop["type"],
            },
        )
        session_id = session.get("id", "")
        session_url = session.get("url", "")
    except Exception as e:  # noqa: BLE001
        logger.warning("Stripe checkout session failed: %s", e)
        # Fallback: pending payment with no URL (admin can still mark paid manually later)

    payment = {
        "id": str(uuid.uuid4()),
        "interest_id": interest["id"],
        "property_id": prop["id"],
        "property_title": prop.get("title", ""),
        "transaction_type": prop["type"],
        "base_price": prop["price"],
        "commission": commission,
        "amount": commission,
        "currency": "USD",
        "method": "stripe",
        "status": "pending",
        "stripe_session_id": session_id,
        "stripe_url": session_url,
        "notes": "",
        "created_at": _now_iso(),
        "paid_at": "",
    }
    await payments_col.insert_one(payment)
    payment.pop("_id", None)
    return PaymentOut(**payment)


@api.get("/payments", response_model=List[PaymentOut])
async def list_payments(user: dict = Depends(require_roles("admin"))):
    docs = await payments_col.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [PaymentOut(**d) for d in docs]


@api.patch("/payments/{payment_id}/mark-paid", response_model=PaymentOut)
async def mark_paid(payment_id: str, user: dict = Depends(require_roles("admin"))):
    now = _now_iso()
    result = await payments_col.update_one(
        {"id": payment_id}, {"$set": {"status": "paid", "paid_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Paiement introuvable")
    doc = await payments_col.find_one({"id": payment_id}, {"_id": 0})
    await interests_col.update_one({"id": doc["interest_id"]}, {"$set": {"status": "closed"}})
    return PaymentOut(**doc)


# ---- Admin management ---------------------------------------------------
@api.get("/admin/users", response_model=List[UserPublic])
async def admin_users(user: dict = Depends(require_roles("admin"))):
    docs = await users_col.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(2000)
    return [
        UserPublic(
            id=d["id"],
            email=d["email"],
            name=d.get("name", ""),
            phone=d.get("phone", ""),
            role=d["role"],
            created_at=d.get("created_at", _now_iso()),
        )
        for d in docs
    ]


@api.get("/admin/stats", response_model=StatsOut)
async def admin_stats(user: dict = Depends(require_roles("admin"))):
    users_total = await users_col.count_documents({})
    clients = await users_col.count_documents({"role": "client"})
    owners = await users_col.count_documents({"role": "owner"})
    properties_total = await properties_col.count_documents({})
    properties_published = await properties_col.count_documents({"status": "published"})
    properties_pending = await properties_col.count_documents({"status": "pending"})
    interests_total = await interests_col.count_documents({})
    interests_new = await interests_col.count_documents({"status": "new"})
    payments_paid = await payments_col.count_documents({"status": "paid"})
    revenue_cursor = payments_col.aggregate(
        [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    )
    revenue_docs = await revenue_cursor.to_list(1)
    revenue_total = float(revenue_docs[0]["total"]) if revenue_docs else 0.0
    return StatsOut(
        users_total=users_total,
        clients=clients,
        owners=owners,
        properties_total=properties_total,
        properties_published=properties_published,
        properties_pending=properties_pending,
        interests_total=interests_total,
        interests_new=interests_new,
        payments_paid=payments_paid,
        revenue_total=revenue_total,
    )


app.include_router(api)
