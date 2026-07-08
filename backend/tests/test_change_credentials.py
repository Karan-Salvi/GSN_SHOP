"""
Tests for the new POST /api/auth/change-credentials endpoint.
Restores credentials to admin@gsnfish.com / Admin@123 after each mutation.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend .env if the test-runner env doesn't have it
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

API = f"{BASE_URL}/api"
ORIG_EMAIL = "admin@gsnfish.com"
ORIG_PASSWORD = "Admin@123"


def _login(session, email, password):
    return session.post(f"{API}/auth/login", json={"email": email, "password": password})


@pytest.fixture(scope="module")
def base_url():
    assert BASE_URL, "REACT_APP_BACKEND_URL not set"
    return BASE_URL


@pytest.fixture
def auth_session():
    """Fresh authenticated session using original admin creds."""
    s = requests.Session()
    r = _login(s, ORIG_EMAIL, ORIG_PASSWORD)
    assert r.status_code == 200, f"Baseline login failed: {r.status_code} {r.text}"
    return s


# --- Backend sanity ---
def test_root_ok(base_url):
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_baseline_login_works():
    """Ensure the seed credentials are usable (needed for all other tests)."""
    r = _login(requests.Session(), ORIG_EMAIL, ORIG_PASSWORD)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == ORIG_EMAIL
    assert data["role"] == "admin"


# --- Auth guard ---
def test_change_credentials_requires_auth():
    r = requests.post(f"{API}/auth/change-credentials",
                      json={"current_password": ORIG_PASSWORD, "new_password": "Whatever@1"})
    assert r.status_code == 401, r.text


# --- Validation ---
def test_change_credentials_wrong_current_password(auth_session):
    r = auth_session.post(f"{API}/auth/change-credentials",
                          json={"current_password": "WRONG!!!", "new_password": "Admin@999"})
    assert r.status_code == 400
    assert "current password" in r.json()["detail"].lower()


def test_change_credentials_nothing_to_update(auth_session):
    r = auth_session.post(f"{API}/auth/change-credentials",
                          json={"current_password": ORIG_PASSWORD})
    assert r.status_code == 400
    assert "nothing to update" in r.json()["detail"].lower()


# --- Password change happy path ---
def test_change_password_happy_path(auth_session):
    new_pw = "Admin@456"

    # Change password
    r = auth_session.post(f"{API}/auth/change-credentials",
                          json={"current_password": ORIG_PASSWORD, "new_password": new_pw})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == ORIG_EMAIL

    # Old password should now fail
    r_old = _login(requests.Session(), ORIG_EMAIL, ORIG_PASSWORD)
    assert r_old.status_code == 401, f"Old password should have been invalidated: {r_old.status_code}"

    # New password should succeed
    s_new = requests.Session()
    r_new = _login(s_new, ORIG_EMAIL, new_pw)
    assert r_new.status_code == 200, r_new.text

    # Restore original password
    r_restore = s_new.post(f"{API}/auth/change-credentials",
                           json={"current_password": new_pw, "new_password": ORIG_PASSWORD})
    assert r_restore.status_code == 200, r_restore.text

    # Verify original password works again
    assert _login(requests.Session(), ORIG_EMAIL, ORIG_PASSWORD).status_code == 200


# --- Email change happy path ---
def test_change_email_happy_path(auth_session):
    new_email = "admin_alt@gsnfish.com"

    r = auth_session.post(f"{API}/auth/change-credentials",
                          json={"current_password": ORIG_PASSWORD, "new_email": new_email})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == new_email

    # Old email should now fail
    r_old = _login(requests.Session(), ORIG_EMAIL, ORIG_PASSWORD)
    assert r_old.status_code == 401

    # New email should succeed
    s_new = requests.Session()
    r_new = _login(s_new, new_email, ORIG_PASSWORD)
    assert r_new.status_code == 200

    # Restore original email
    r_restore = s_new.post(f"{API}/auth/change-credentials",
                           json={"current_password": ORIG_PASSWORD, "new_email": ORIG_EMAIL})
    assert r_restore.status_code == 200
    assert r_restore.json()["email"] == ORIG_EMAIL

    # Sanity: original login works again
    assert _login(requests.Session(), ORIG_EMAIL, ORIG_PASSWORD).status_code == 200


# --- Persistence across backend restart ---
def test_password_source_manual_survives_restart(auth_session):
    """
    After a manual change, the seed_admin logic must NOT overwrite the password on restart.
    We flip to a new password, restart supervisor backend, then confirm the new password still
    works. Finally restore.
    """
    new_pw = "Admin@789"

    # Change to new_pw
    r = auth_session.post(f"{API}/auth/change-credentials",
                          json={"current_password": ORIG_PASSWORD, "new_password": new_pw})
    assert r.status_code == 200, r.text

    # Restart backend
    os.system("sudo supervisorctl restart backend >/dev/null 2>&1")
    # Wait for backend to come back up
    for _ in range(30):
        try:
            if requests.get(f"{API}/", timeout=2).status_code == 200:
                break
        except Exception:
            pass
        time.sleep(1)
    else:
        pytest.fail("Backend did not come back up after restart")

    # After restart, new_pw should still work (i.e. seed_admin didn't clobber it)
    s_new = requests.Session()
    r_new = _login(s_new, ORIG_EMAIL, new_pw)
    assert r_new.status_code == 200, (
        f"Manually-changed password was overwritten on restart! login->{r_new.status_code} {r_new.text}"
    )

    # Env password Admin@123 should NOT work right now (was replaced by manual change)
    r_env = _login(requests.Session(), ORIG_EMAIL, ORIG_PASSWORD)
    assert r_env.status_code == 401, "Old env password should not authenticate after manual change"

    # Restore
    r_restore = s_new.post(f"{API}/auth/change-credentials",
                           json={"current_password": new_pw, "new_password": ORIG_PASSWORD})
    assert r_restore.status_code == 200
    assert _login(requests.Session(), ORIG_EMAIL, ORIG_PASSWORD).status_code == 200


# --- Short password rejected ---
def test_short_new_password_rejected(auth_session):
    r = auth_session.post(f"{API}/auth/change-credentials",
                          json={"current_password": ORIG_PASSWORD, "new_password": "abc"})
    assert r.status_code == 400
    assert "at least 6" in r.json()["detail"].lower()
