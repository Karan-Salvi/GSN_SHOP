"""Backend tests for the Home page hero banner image feature (GSN Fresh Fish)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://gsn-seafood-shop.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEFAULT_HERO = "https://images.pexels.com/photos/3903587/pexels-photo-3903587.jpeg"
NEW_URL = "https://images.pexels.com/photos/34155535/pexels-photo-34155535.jpeg"
# tiny 1x1 red JPEG base64 data URL
DATA_URL = (
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAACQr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AKpgAf/Z"
)

ADMIN_EMAIL = "admin@gsnfish.com"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    token = r.json().get("token")
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    return s


@pytest.fixture(scope="module")
def original_hero(anon_client):
    """Capture the value at test start so we can restore it at the end."""
    r = anon_client.get(f"{API}/settings")
    assert r.status_code == 200
    return r.json().get("hero_image")


# --- Tests ---

def test_settings_returns_hero_image_field(anon_client):
    r = anon_client.get(f"{API}/settings")
    assert r.status_code == 200
    data = r.json()
    assert "hero_image" in data, "settings response missing hero_image key"
    assert isinstance(data["hero_image"], str)
    assert data["hero_image"], "hero_image should not be empty by default"


def test_put_settings_requires_auth(anon_client):
    r = anon_client.put(f"{API}/admin/settings", json={"hero_image": NEW_URL})
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"


def test_put_hero_image_url_persists(admin_client, anon_client):
    r = admin_client.put(f"{API}/admin/settings", json={"hero_image": NEW_URL})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("hero_image") == NEW_URL

    # verify persistence via public GET
    r2 = anon_client.get(f"{API}/settings")
    assert r2.status_code == 200
    assert r2.json().get("hero_image") == NEW_URL


def test_put_hero_image_data_url_persists(admin_client, anon_client):
    r = admin_client.put(f"{API}/admin/settings", json={"hero_image": DATA_URL})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("hero_image") == DATA_URL

    r2 = anon_client.get(f"{API}/settings")
    assert r2.status_code == 200
    assert r2.json().get("hero_image") == DATA_URL


def test_restore_default_hero_image(admin_client, anon_client, original_hero):
    # Revert to the request-mandated default so the owner sees the original banner.
    r = admin_client.put(f"{API}/admin/settings", json={"hero_image": DEFAULT_HERO})
    assert r.status_code == 200
    assert r.json().get("hero_image") == DEFAULT_HERO

    r2 = anon_client.get(f"{API}/settings")
    assert r2.status_code == 200
    assert r2.json().get("hero_image") == DEFAULT_HERO
