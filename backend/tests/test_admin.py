from fastapi.testclient import TestClient

from app.models import User, UserRole
from tests.conftest import SeedData, auth_header


def test_configured_uid_is_provisioned_as_admin(api_client: TestClient, db_session, monkeypatch) -> None:
    monkeypatch.setattr("app.config.settings.admin_firebase_uid", "configured-admin")

    response = api_client.get("/api/me", headers=auth_header("configured-admin"))

    assert response.status_code == 200
    assert response.json()["role"] == "ADMIN"
    assert db_session.query(User).filter_by(firebase_uid="configured-admin").one().role == UserRole.ADMIN


def test_only_configured_admin_can_list_users(api_client: TestClient, seed_data: SeedData) -> None:
    assert api_client.get("/api/admin/users", headers=auth_header(seed_data.owner.firebase_uid)).status_code == 403

    response = api_client.get("/api/admin/users", headers=auth_header(seed_data.admin.firebase_uid))
    assert response.status_code == 200
    assert {user["id"] for user in response.json()} == {
        seed_data.owner.id, seed_data.other_owner.id, seed_data.operator.id,
    }


def test_admin_can_change_owner_and_operator_roles(api_client: TestClient, seed_data: SeedData) -> None:
    headers = auth_header(seed_data.admin.firebase_uid)
    promote = api_client.patch(f"/api/admin/users/{seed_data.owner.id}/role", headers=headers, json={"role": "OPERATOR"})
    demote = api_client.patch(f"/api/admin/users/{seed_data.operator.id}/role", headers=headers, json={"role": "OWNER"})

    assert promote.status_code == 200
    assert promote.json()["role"] == "OPERATOR"
    assert demote.status_code == 200
    assert demote.json()["role"] == "OWNER"


def test_admin_role_changes_reject_missing_admin_and_admin_assignment(api_client: TestClient, seed_data: SeedData) -> None:
    headers = auth_header(seed_data.admin.firebase_uid)
    assert api_client.patch("/api/admin/users/99999/role", headers=headers, json={"role": "OWNER"}).status_code == 404
    assert api_client.patch(f"/api/admin/users/{seed_data.owner.id}/role", headers=headers, json={"role": "ADMIN"}).status_code == 422
    response = api_client.patch(f"/api/admin/users/{seed_data.admin.id}/role", headers=headers, json={"role": "OWNER"})
    assert response.status_code == 409
