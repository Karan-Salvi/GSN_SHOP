"""Backend tests for the homepage hero heading feature (hero_title_mr / hero_title_en)."""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None

# Load frontend/.env if REACT_APP_BACKEND_URL not exported to shell
if not BASE_URL:
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break

ADMIN_EMAIL = "admin@gsnfish.com"
ADMIN_PASSWORD = "Admin@123"

DEFAULT_MR = "ताजे मासे, थेट समुद्रातून"
DEFAULT_EN = "Fresh Fish, Straight from the Coast"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_client(api_client):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    # cookies are set on session
    return s


@pytest.fixture(scope="module")
def baseline(api_client):
    """Capture the initial shop-status so we can restore it after tests."""
    r = api_client.get(f"{BASE_URL}/api/shop-status")
    r.raise_for_status()
    return r.json()


# ---- GET /api/shop-status ----
class TestGetShopStatus:
    def test_returns_hero_title_fields(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/shop-status")
        assert r.status_code == 200
        data = r.json()
        assert "hero_title_mr" in data, f"missing hero_title_mr in {data}"
        assert "hero_title_en" in data, f"missing hero_title_en in {data}"
        assert isinstance(data["hero_title_mr"], str)
        assert isinstance(data["hero_title_en"], str)
        assert data["hero_title_mr"], "hero_title_mr should not be empty"
        assert data["hero_title_en"], "hero_title_en should not be empty"


# ---- PUT /api/admin/shop-status ----
class TestUpdateShopStatus:
    def test_unauthed_put_returns_401(self, api_client):
        r = api_client.put(
            f"{BASE_URL}/api/admin/shop-status",
            json={"is_open": True, "notice": "x", "hero_title_mr": "y", "hero_title_en": "z"},
        )
        assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text}"

    def test_put_persists_hero_titles(self, auth_client, api_client, baseline):
        payload = {
            "is_open": baseline.get("is_open", True),
            "notice": baseline.get("notice", ""),
            "hero_title_mr": "TEST_चाचणी शीर्षक",
            "hero_title_en": "TEST_Test Heading",
        }
        r = auth_client.put(f"{BASE_URL}/api/admin/shop-status", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["hero_title_mr"] == "TEST_चाचणी शीर्षक"
        assert data["hero_title_en"] == "TEST_Test Heading"

        # Verify via public GET (persistence)
        g = api_client.get(f"{BASE_URL}/api/shop-status")
        assert g.status_code == 200
        gd = g.json()
        assert gd["hero_title_mr"] == "TEST_चाचणी शीर्षक"
        assert gd["hero_title_en"] == "TEST_Test Heading"

    def test_put_without_hero_titles_preserves_them(self, auth_client, api_client, baseline):
        # First ensure titles are the TEST_ values (from previous test) or set them explicitly
        auth_client.put(f"{BASE_URL}/api/admin/shop-status", json={
            "is_open": baseline.get("is_open", True),
            "notice": baseline.get("notice", ""),
            "hero_title_mr": "TEST_preserve_mr",
            "hero_title_en": "TEST_preserve_en",
        })

        # Now update with only is_open + notice, omitting hero_title_* fields
        r = auth_client.put(f"{BASE_URL}/api/admin/shop-status", json={
            "is_open": baseline.get("is_open", True),
            "notice": "TEST_notice_only",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        # Titles must NOT have been wiped
        assert data["hero_title_mr"] == "TEST_preserve_mr", f"hero_title_mr got wiped: {data}"
        assert data["hero_title_en"] == "TEST_preserve_en", f"hero_title_en got wiped: {data}"
        assert data["notice"] == "TEST_notice_only"

        # Confirm through GET as well
        g = api_client.get(f"{BASE_URL}/api/shop-status").json()
        assert g["hero_title_mr"] == "TEST_preserve_mr"
        assert g["hero_title_en"] == "TEST_preserve_en"


# ---- Restore defaults at end of module ----
def test_zzz_restore_defaults(auth_client, baseline):
    """Runs last (alphabetical). Restores original values captured at start."""
    payload = {
        "is_open": baseline.get("is_open", True),
        "notice": baseline.get("notice", ""),
        "hero_title_mr": DEFAULT_MR,
        "hero_title_en": DEFAULT_EN,
    }
    r = auth_client.put(f"{BASE_URL}/api/admin/shop-status", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["hero_title_mr"] == DEFAULT_MR
    assert data["hero_title_en"] == DEFAULT_EN
