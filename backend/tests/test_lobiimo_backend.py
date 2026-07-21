"""LobiImo backend end-to-end tests.

Runs against the public preview URL configured in /app/frontend/.env.
Follows the review request scenario:
  health → auth → properties → favorites → interests → payments → admin → RBAC
"""
from __future__ import annotations

import os
import uuid

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@lobiimo.cd"
ADMIN_PASSWORD = "LobiImoAdmin2026!"


# ------------------------------------------------------------------ fixtures
@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def state(http):
    """Shared state across tests (tokens, ids)."""
    return {}


# ------------------------------------------------------------------ 1. health
def test_health(http):
    r = http.get(f"{API}/health", timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "ok"
    assert "time" in body


# ------------------------------------------------------------------ 2. auth
def test_register_client(http, state):
    email = f"TEST_client_{uuid.uuid4().hex[:8]}@lobiimo.cd"
    r = http.post(
        f"{API}/auth/register",
        json={"email": email, "password": "client123", "name": "Test Client",
              "phone": "+243900000001", "role": "client"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "token" in body and "user" in body
    assert body["user"]["role"] == "client"
    assert body["user"]["email"] == email
    state["client_token"] = body["token"]
    state["client_id"] = body["user"]["id"]
    state["client_email"] = email


def test_register_owner(http, state):
    email = f"TEST_owner_{uuid.uuid4().hex[:8]}@lobiimo.cd"
    r = http.post(
        f"{API}/auth/register",
        json={"email": email, "password": "owner123", "name": "Test Owner",
              "phone": "+243900000002", "role": "owner"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "owner"
    state["owner_token"] = body["token"]
    state["owner_id"] = body["user"]["id"]
    state["owner_email"] = email


def test_register_owner_2(http, state):
    """Second owner used for the '403 delete other owner property' check."""
    email = f"TEST_owner2_{uuid.uuid4().hex[:8]}@lobiimo.cd"
    r = http.post(
        f"{API}/auth/register",
        json={"email": email, "password": "owner123", "name": "Owner Two",
              "phone": "+243900000003", "role": "owner"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    state["owner2_token"] = r.json()["token"]


def test_register_admin_rejected(http):
    r = http.post(
        f"{API}/auth/register",
        json={"email": f"TEST_admin_{uuid.uuid4().hex[:6]}@lobiimo.cd",
              "password": "hacker123", "name": "Nope", "role": "admin"},
        timeout=15,
    )
    assert r.status_code == 400, r.text


def test_admin_login(http, state):
    r = http.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "admin"
    assert body["user"]["email"] == ADMIN_EMAIL
    state["admin_token"] = body["token"]
    state["admin_id"] = body["user"]["id"]


def test_auth_me(http, state):
    r = http.get(f"{API}/auth/me", headers=_auth(state["admin_token"]), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "admin"


def test_login_wrong_password(http):
    r = http.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": "WRONG"},
        timeout=15,
    )
    assert r.status_code == 400, r.text


# ------------------------------------------------------------------ 3. properties
def _prop_payload(kind: str) -> dict:
    if kind == "location":
        return {
            "title": "TEST Appart 2ch Gombe",
            "description": "Bel appartement rénové",
            "type": "location", "price": 800,
            "commune": "Gombe", "quartier": "Royale",
            "address": "Av. Test 1", "bedrooms": 2, "bathrooms": 1,
            "surface": 90, "amenities": ["parking"], "photos": [],
        }
    return {
        "title": "TEST Villa Ma Campagne",
        "description": "Villa à vendre",
        "type": "vente", "price": 150000,
        "commune": "Ngaliema", "quartier": "Ma Campagne",
        "address": "Av. Test 2", "bedrooms": 4, "bathrooms": 3,
        "surface": 300, "amenities": ["pool"], "photos": [],
    }


def test_owner_creates_location(http, state):
    r = http.post(f"{API}/properties", json=_prop_payload("location"),
                  headers=_auth(state["owner_token"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["type"] == "location"
    assert body["price"] == 800
    state["prop_location_id"] = body["id"]


def test_owner_creates_vente(http, state):
    r = http.post(f"{API}/properties", json=_prop_payload("vente"),
                  headers=_auth(state["owner_token"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["type"] == "vente"
    assert body["price"] == 150000
    state["prop_vente_id"] = body["id"]


def test_client_does_not_see_pending(http, state):
    r = http.get(f"{API}/properties", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert state["prop_location_id"] not in ids
    assert state["prop_vente_id"] not in ids


def test_admin_publishes_both(http, state):
    for pid in (state["prop_location_id"], state["prop_vente_id"]):
        r = http.patch(f"{API}/properties/{pid}/status",
                       json={"status": "published"},
                       headers=_auth(state["admin_token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "published"


def test_client_sees_published(http, state):
    r = http.get(f"{API}/properties", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert state["prop_location_id"] in ids
    assert state["prop_vente_id"] in ids


def test_filter_by_type_location(http, state):
    r = http.get(f"{API}/properties?type=location", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200
    props = r.json()
    assert any(p["id"] == state["prop_location_id"] for p in props)
    assert all(p["type"] == "location" for p in props)


def test_filter_by_type_vente(http, state):
    r = http.get(f"{API}/properties?type=vente", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200
    props = r.json()
    assert any(p["id"] == state["prop_vente_id"] for p in props)
    assert all(p["type"] == "vente" for p in props)


def test_property_detail(http, state):
    r = http.get(f"{API}/properties/{state['prop_location_id']}",
                 headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["id"] == state["prop_location_id"]


def test_owner_cannot_delete_other_owner_property(http, state):
    r = http.delete(f"{API}/properties/{state['prop_location_id']}",
                    headers=_auth(state["owner2_token"]), timeout=15)
    assert r.status_code == 403, r.text


# ------------------------------------------------------------------ 4. favorites
def test_client_add_favorite(http, state):
    pid = state["prop_location_id"]
    r = http.post(f"{API}/favorites/{pid}", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("success") is True


def test_client_list_favorites(http, state):
    r = http.get(f"{API}/favorites", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert state["prop_location_id"] in ids


def test_client_remove_favorite(http, state):
    pid = state["prop_location_id"]
    r = http.delete(f"{API}/favorites/{pid}", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200
    # Verify removal
    r2 = http.get(f"{API}/favorites", headers=_auth(state["client_token"]), timeout=15)
    assert state["prop_location_id"] not in [p["id"] for p in r2.json()]


def test_owner_cannot_access_favorites(http, state):
    r = http.get(f"{API}/favorites", headers=_auth(state["owner_token"]), timeout=15)
    assert r.status_code == 403, r.text


# ------------------------------------------------------------------ 5. interests
def test_client_creates_interest_location(http, state):
    r = http.post(f"{API}/interests",
                  json={"property_id": state["prop_location_id"], "message": "Intéressé"},
                  headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "new"
    assert body["property_id"] == state["prop_location_id"]
    state["interest_location_id"] = body["id"]


def test_client_creates_interest_vente(http, state):
    r = http.post(f"{API}/interests",
                  json={"property_id": state["prop_vente_id"], "message": "Achat"},
                  headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "new"
    state["interest_vente_id"] = body["id"]


def test_client_lists_own_interests(http, state):
    r = http.get(f"{API}/interests", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 200
    interests = r.json()
    assert all(i["client_id"] == state["client_id"] for i in interests)
    ids = [i["id"] for i in interests]
    assert state["interest_location_id"] in ids
    assert state["interest_vente_id"] in ids


def test_owner_sees_only_own_properties_interests(http, state):
    r = http.get(f"{API}/interests", headers=_auth(state["owner_token"]), timeout=15)
    assert r.status_code == 200
    interests = r.json()
    assert all(i["owner_id"] == state["owner_id"] for i in interests)
    # our 2 interests must be in there
    ids = [i["id"] for i in interests]
    assert state["interest_location_id"] in ids
    assert state["interest_vente_id"] in ids


def test_owner2_does_not_see_others_interests(http, state):
    r = http.get(f"{API}/interests", headers=_auth(state["owner2_token"]), timeout=15)
    assert r.status_code == 200
    ids = [i["id"] for i in r.json()]
    assert state["interest_location_id"] not in ids
    assert state["interest_vente_id"] not in ids


def test_admin_sees_all_interests(http, state):
    r = http.get(f"{API}/interests", headers=_auth(state["admin_token"]), timeout=15)
    assert r.status_code == 200
    ids = [i["id"] for i in r.json()]
    assert state["interest_location_id"] in ids
    assert state["interest_vente_id"] in ids


def test_admin_updates_interest_status(http, state):
    for iid in (state["interest_location_id"], state["interest_vente_id"]):
        r = http.patch(f"{API}/interests/{iid}",
                       json={"status": "connected"},
                       headers=_auth(state["admin_token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "connected"


def test_client_cannot_patch_interest(http, state):
    r = http.patch(f"{API}/interests/{state['interest_location_id']}",
                   json={"status": "closed"},
                   headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 403


# ------------------------------------------------------------------ 6. payments
def test_manual_payment_location_commission(http, state):
    r = http.post(f"{API}/payments/manual",
                  json={"interest_id": state["interest_location_id"], "notes": "TEST manuel"},
                  headers=_auth(state["admin_token"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    # location commission = 1 month rent = 800
    assert body["commission"] == 800
    assert body["amount"] == 800
    assert body["transaction_type"] == "location"
    assert body["method"] == "manual"
    assert body["status"] == "paid"
    state["payment_location_id"] = body["id"]


def test_manual_payment_vente_commission(http, state):
    r = http.post(f"{API}/payments/manual",
                  json={"interest_id": state["interest_vente_id"], "notes": "TEST manuel vente"},
                  headers=_auth(state["admin_token"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    # vente commission = 10% of 150000 = 15000
    assert body["commission"] == 15000
    assert body["amount"] == 15000
    assert body["transaction_type"] == "vente"
    assert body["status"] == "paid"


def test_list_payments(http, state):
    r = http.get(f"{API}/payments", headers=_auth(state["admin_token"]), timeout=15)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert state["payment_location_id"] in ids


def test_stripe_payment_creation(http, state):
    # Need a new "connected" interest to attach to (previous were closed by manual payment).
    # Create a fresh property + interest.
    prop = _prop_payload("location")
    prop["title"] = "TEST Stripe Prop"
    pr = http.post(f"{API}/properties", json=prop,
                   headers=_auth(state["owner_token"]), timeout=15)
    assert pr.status_code == 200
    pid = pr.json()["id"]
    http.patch(f"{API}/properties/{pid}/status", json={"status": "published"},
               headers=_auth(state["admin_token"]), timeout=15)
    ir = http.post(f"{API}/interests", json={"property_id": pid, "message": "stripe"},
                   headers=_auth(state["client_token"]), timeout=15)
    assert ir.status_code == 200
    iid = ir.json()["id"]

    r = http.post(f"{API}/payments/stripe",
                  json={"interest_id": iid,
                        "success_url": "https://example.com/ok",
                        "cancel_url": "https://example.com/cancel"},
                  headers=_auth(state["admin_token"]), timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["method"] == "stripe"
    assert body["status"] == "pending"
    # stripe_url may be empty on invalid test key — both accepted
    assert "stripe_url" in body
    state["payment_stripe_id"] = body["id"]


def test_mark_paid_transitions_pending_to_paid(http, state):
    pid = state["payment_stripe_id"]
    r = http.patch(f"{API}/payments/{pid}/mark-paid",
                   headers=_auth(state["admin_token"]), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "paid"
    assert body["paid_at"]


# ------------------------------------------------------------------ 7. admin
def test_admin_stats(http, state):
    r = http.get(f"{API}/admin/stats", headers=_auth(state["admin_token"]), timeout=15)
    assert r.status_code == 200
    body = r.json()
    for key in ("users_total", "clients", "owners", "properties_total",
                "properties_published", "properties_pending", "interests_total",
                "interests_new", "payments_paid", "revenue_total"):
        assert key in body
    assert body["users_total"] >= 4  # admin + client + 2 owners
    assert body["payments_paid"] >= 2
    assert body["revenue_total"] >= 800 + 15000


def test_admin_users_list(http, state):
    r = http.get(f"{API}/admin/users", headers=_auth(state["admin_token"]), timeout=15)
    assert r.status_code == 200
    users = r.json()
    emails = [u["email"] for u in users]
    assert ADMIN_EMAIL in emails
    assert state["client_email"] in emails
    assert state["owner_email"] in emails


# ------------------------------------------------------------------ 8. RBAC
def test_client_cannot_create_property(http, state):
    r = http.post(f"{API}/properties", json=_prop_payload("location"),
                  headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code in (401, 403), r.text


def test_non_admin_cannot_access_admin_stats(http, state):
    r = http.get(f"{API}/admin/stats", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 403
    r2 = http.get(f"{API}/admin/stats", headers=_auth(state["owner_token"]), timeout=15)
    assert r2.status_code == 403


def test_non_admin_cannot_access_admin_users(http, state):
    r = http.get(f"{API}/admin/users", headers=_auth(state["client_token"]), timeout=15)
    assert r.status_code == 403


def test_owner_cannot_patch_interest(http, state):
    r = http.patch(f"{API}/interests/{state['interest_location_id']}",
                   json={"status": "closed"},
                   headers=_auth(state["owner_token"]), timeout=15)
    assert r.status_code == 403


def test_missing_token_returns_401(http):
    r = http.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401
