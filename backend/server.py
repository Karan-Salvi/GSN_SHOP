from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# --- Config ---
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 12  # 12h so admin doesn't get logged out too soon
REFRESH_TOKEN_DAYS = 7

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="GSN Fresh Fish Service API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("gsn")


# --- Helpers ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax",
                        max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax",
                        max_age=REFRESH_TOKEN_DAYS * 24 * 3600, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- Models ---
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class FishIn(BaseModel):
    name_en: str
    name_mr: str
    price_per_kg: float
    available: bool = True
    image_base64: Optional[str] = None
    description: Optional[str] = ""
    is_special: bool = False


class FishOut(FishIn):
    id: str
    created_at: str


class ShopStatusIn(BaseModel):
    is_open: bool
    notice: Optional[str] = ""


class SettingsIn(BaseModel):
    owner_name: Optional[str] = None
    mobile: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    google_maps_url: Optional[str] = None
    google_maps_embed: Optional[str] = None
    business_hours: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None


# --- Fish helpers ---
def fish_doc_to_out(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name_en": doc.get("name_en", ""),
        "name_mr": doc.get("name_mr", ""),
        "price_per_kg": float(doc.get("price_per_kg", 0)),
        "available": bool(doc.get("available", True)),
        "image_base64": doc.get("image_base64"),
        "description": doc.get("description", ""),
        "is_special": bool(doc.get("is_special", False)),
        "created_at": doc.get("created_at", datetime.now(timezone.utc).isoformat()),
    }


DEFAULT_SETTINGS = {
    "_id": "settings",
    "owner_name": "Ganesh S. Naik",
    "mobile": "+91 98765 43210",
    "whatsapp": "+91 98765 43210",
    "address": "Shop No. 12, Fish Market Road, Mumbai, Maharashtra 400001",
    "google_maps_url": "https://maps.app.goo.gl/pduq6ASVitS9iEtF6",
    "google_maps_embed": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.11609823277!2d72.71637099863283!3d19.08251820777361!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sMumbai%20fish%20market!5e0!3m2!1sen!2sin!4v1700000000000",
    "business_hours": "सोम - रवि: सकाळी ६:०० - रात्री ९:०० | Mon-Sun: 6:00 AM - 9:00 PM",
    "facebook_url": "",
    "instagram_url": "",
}

DEFAULT_SHOP_STATUS = {
    "_id": "shop_status",
    "is_open": True,
    "notice": "आजचे ताजे मासे उपलब्ध आहेत! Fresh Fish Arrived Today",
}


# --- Auth routes ---
@api_router.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user.get("name", "Admin"), "role": user.get("role", "admin"), "token": access}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["_id"], "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")}


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax",
                            max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# --- Public routes ---
@api_router.get("/")
async def root():
    return {"message": "GSN Fresh Fish Service API"}


@api_router.get("/fish")
async def list_fish():
    docs = await db.fish.find({}).sort("created_at", -1).to_list(500)
    return [fish_doc_to_out(d) for d in docs]


@api_router.get("/shop-status")
async def get_shop_status():
    doc = await db.shop_meta.find_one({"_id": "shop_status"})
    if not doc:
        doc = DEFAULT_SHOP_STATUS
    return {"is_open": doc.get("is_open", True), "notice": doc.get("notice", "")}


@api_router.get("/settings")
async def get_settings():
    doc = await db.shop_meta.find_one({"_id": "settings"})
    if not doc:
        doc = DEFAULT_SETTINGS
    doc.pop("_id", None)
    return doc


# --- Admin protected routes ---
@api_router.post("/admin/fish")
async def create_fish(body: FishIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.fish.insert_one(doc)
    doc["_id"] = res.inserted_id
    return fish_doc_to_out(doc)


@api_router.put("/admin/fish/{fish_id}")
async def update_fish(fish_id: str, body: FishIn, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(fish_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid fish id")
    res = await db.fish.update_one({"_id": oid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fish not found")
    doc = await db.fish.find_one({"_id": oid})
    return fish_doc_to_out(doc)


@api_router.delete("/admin/fish/{fish_id}")
async def delete_fish(fish_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(fish_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid fish id")
    res = await db.fish.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fish not found")
    return {"ok": True}


@api_router.put("/admin/shop-status")
async def update_shop_status(body: ShopStatusIn, user: dict = Depends(get_current_user)):
    await db.shop_meta.update_one(
        {"_id": "shop_status"},
        {"$set": {"is_open": body.is_open, "notice": body.notice or ""}},
        upsert=True,
    )
    return {"is_open": body.is_open, "notice": body.notice or ""}


@api_router.put("/admin/settings")
async def update_settings(body: SettingsIn, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.shop_meta.update_one({"_id": "settings"}, {"$set": update}, upsert=True)
    doc = await db.shop_meta.find_one({"_id": "settings"})
    doc.pop("_id", None)
    return doc


# --- Startup ---
@app.on_event("startup")
async def startup_event():
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gsnfish.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "GSN Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info("Admin password re-hashed from env")

    # Seed default settings & shop status
    if not await db.shop_meta.find_one({"_id": "settings"}):
        await db.shop_meta.insert_one(DEFAULT_SETTINGS)
    if not await db.shop_meta.find_one({"_id": "shop_status"}):
        await db.shop_meta.insert_one(DEFAULT_SHOP_STATUS)

    # Seed sample fish if empty
    if await db.fish.count_documents({}) == 0:
        samples = [
            {"name_en": "Pomfret", "name_mr": "पापलेट", "price_per_kg": 850, "available": True,
             "description": "Fresh silver pomfret, catch of the day.", "is_special": True},
            {"name_en": "Rohu", "name_mr": "रोहू", "price_per_kg": 320, "available": True,
             "description": "Freshwater rohu, ideal for curry.", "is_special": False},
            {"name_en": "Surmai (King Fish)", "name_mr": "सुरमई", "price_per_kg": 950, "available": True,
             "description": "Boneless king fish steaks.", "is_special": True},
            {"name_en": "Bangda (Mackerel)", "name_mr": "बांगडा", "price_per_kg": 280, "available": True,
             "description": "Coastal mackerel, perfect fry.", "is_special": False},
            {"name_en": "Bombil (Bombay Duck)", "name_mr": "बोंबील", "price_per_kg": 400, "available": False,
             "description": "Dried and fresh bombil available.", "is_special": False},
            {"name_en": "Prawns", "name_mr": "कोळंबी", "price_per_kg": 720, "available": True,
             "description": "Medium-large fresh prawns.", "is_special": True},
        ]
        now = datetime.now(timezone.utc).isoformat()
        for s in samples:
            s["created_at"] = now
            s["image_base64"] = None
        await db.fish.insert_many(samples)
        logger.info("Seeded sample fish")


@app.on_event("shutdown")
async def shutdown_event():
    client.close()


# CORS
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
