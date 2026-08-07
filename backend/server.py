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


COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = "none" if COOKIE_SECURE else "lax"


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie("access_token", access, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
                        max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
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


class ChangeCredsIn(BaseModel):
    current_password: str
    new_email: Optional[EmailStr] = None
    new_password: Optional[str] = None


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


class FishPatch(BaseModel):
    name_en: Optional[str] = None
    name_mr: Optional[str] = None
    price_per_kg: Optional[float] = None
    available: Optional[bool] = None
    image_base64: Optional[str] = None
    description: Optional[str] = None
    is_special: Optional[bool] = None


class FishOut(FishIn):
    id: str
    created_at: str


class ShopStatusIn(BaseModel):
    is_open: bool
    notice: Optional[str] = ""
    hero_title_mr: Optional[str] = None
    hero_title_en: Optional[str] = None


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
    hero_image: Optional[str] = None


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
    "hero_image": "https://images.pexels.com/photos/3903587/pexels-photo-3903587.jpeg",
}

DEFAULT_SHOP_STATUS = {
    "_id": "shop_status",
    "is_open": True,
    "notice": "आजचे ताजे मासे उपलब्ध आहेत! Fresh Fish Arrived Today",
    "hero_title_mr": "ताजे मासे, थेट समुद्रातून",
    "hero_title_en": "Fresh Fish, Straight from the Coast",
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
    for name in ("access_token", "refresh_token"):
        response.set_cookie(name, "", httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
                            max_age=0, expires=0, path="/")
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
        response.set_cookie("access_token", access, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE,
                            max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.post("/auth/change-credentials")
async def change_credentials(body: ChangeCredsIn, response: Response, user: dict = Depends(get_current_user)):
    # Load the full user (with password_hash) for verification
    full = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not full or not verify_password(body.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    update: dict = {"password_source": "manual"}

    new_email = (body.new_email or "").strip().lower()
    if new_email and new_email != full["email"]:
        clash = await db.users.find_one({"email": new_email, "_id": {"$ne": full["_id"]}})
        if clash:
            raise HTTPException(status_code=400, detail="This email is already taken")
        update["email"] = new_email

    if body.new_password:
        if len(body.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        update["password_hash"] = hash_password(body.new_password)

    if len(update) == 1:  # only password_source, nothing else changed
        raise HTTPException(status_code=400, detail="Nothing to update")

    await db.users.update_one({"_id": full["_id"]}, {"$set": update})

    # Refresh session cookies so the user stays signed in
    new_uid = str(full["_id"])
    email_out = update.get("email", full["email"])
    access = create_access_token(new_uid, email_out)
    refresh = create_refresh_token(new_uid)
    set_auth_cookies(response, access, refresh)

    return {"id": new_uid, "email": email_out, "name": full.get("name", "Admin"),
            "role": full.get("role", "admin")}


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
    return {
        "is_open": doc.get("is_open", True),
        "notice": doc.get("notice", ""),
        "hero_title_mr": doc.get("hero_title_mr", DEFAULT_SHOP_STATUS["hero_title_mr"]),
        "hero_title_en": doc.get("hero_title_en", DEFAULT_SHOP_STATUS["hero_title_en"]),
    }


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
async def update_fish(fish_id: str, body: FishPatch, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(fish_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid fish id")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.fish.update_one({"_id": oid}, {"$set": update})
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
    update = {"is_open": body.is_open, "notice": body.notice or ""}
    if body.hero_title_mr is not None:
        update["hero_title_mr"] = body.hero_title_mr
    if body.hero_title_en is not None:
        update["hero_title_en"] = body.hero_title_en
    await db.shop_meta.update_one({"_id": "shop_status"}, {"$set": update}, upsert=True)
    doc = await db.shop_meta.find_one({"_id": "shop_status"}) or {}
    return {
        "is_open": doc.get("is_open", True),
        "notice": doc.get("notice", ""),
        "hero_title_mr": doc.get("hero_title_mr", DEFAULT_SHOP_STATUS["hero_title_mr"]),
        "hero_title_en": doc.get("hero_title_en", DEFAULT_SHOP_STATUS["hero_title_en"]),
    }


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
    # Seed admin (only creates the initial admin; never overwrites a manually-changed password)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@gsnfish.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"role": "admin"})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "GSN Admin",
            "role": "admin",
            "password_source": "env",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    elif existing.get("password_source") != "manual" and not verify_password(admin_password, existing["password_hash"]):
        # Only re-hash from env if the owner has never manually changed the password
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"password_hash": hash_password(admin_password), "email": admin_email, "password_source": "env"}},
        )
        logger.info("Admin password re-hashed from env")

    # Seed default settings & shop status
    if not await db.shop_meta.find_one({"_id": "settings"}):
        await db.shop_meta.insert_one(DEFAULT_SETTINGS)
    else:
        # Backfill any missing default keys (e.g. new hero_image field) on existing settings docs.
        current = await db.shop_meta.find_one({"_id": "settings"})
        backfill = {k: v for k, v in DEFAULT_SETTINGS.items() if k != "_id" and k not in current}
        if backfill:
            await db.shop_meta.update_one({"_id": "settings"}, {"$set": backfill})
    if not await db.shop_meta.find_one({"_id": "shop_status"}):
        await db.shop_meta.insert_one(DEFAULT_SHOP_STATUS)
    else:
        current_status = await db.shop_meta.find_one({"_id": "shop_status"})
        status_backfill = {k: v for k, v in DEFAULT_SHOP_STATUS.items() if k != "_id" and k not in current_status}
        if status_backfill:
            await db.shop_meta.update_one({"_id": "shop_status"}, {"$set": status_backfill})



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
