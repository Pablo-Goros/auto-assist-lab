from fastapi.testclient import TestClient

from app.models import ProblemType, ServiceRequest, User, UserRole, Workshop
from tests.conftest import SeedData, auth_header


def test_new_identity_must_select_tenant_before_using_tenant_endpoints(api_client: TestClient) -> None:
    headers = auth_header("new-owner-uid")

    assert api_client.get("/api/me", headers=headers).json()["tenant"] is None
    blocked = api_client.get("/api/service-requests/me", headers=headers)
    assert blocked.status_code == 409
    assert blocked.json()["detail"] == "Select a country tenant before using this endpoint"

    tenants = api_client.get("/api/tenants", headers=headers)
    assert tenants.status_code == 200
    assert tenants.json() == [{"code": "AR", "name": "Argentina"}, {"code": "CL", "name": "Chile"}]

    selected = api_client.post("/api/me/tenant", headers=headers, json={"tenant_code": "CL"})
    assert selected.status_code == 200
    assert selected.json()["tenant"] == {"code": "CL", "name": "Chile"}
    assert api_client.post("/api/me/tenant", headers=headers, json={"tenant_code": "AR"}).status_code == 409


def test_operator_cannot_see_or_assign_another_tenant(api_client: TestClient, db_session, seed_data: SeedData) -> None:
    chile_owner = User(
        firebase_uid="chile-owner",
        email="chile-owner@example.test",
        name="Chile Owner",
        role=UserRole.OWNER,
        tenant_code="CL",
    )
    chile_workshop = Workshop(name="Chile Workshop", specialty="TIRE", tenant_code="CL", active=True)
    db_session.add_all([chile_owner, chile_workshop])
    db_session.flush()
    chile_request = ServiceRequest(
        owner_id=chile_owner.id,
        tenant_code="CL",
        vehicle="Suzuki Swift",
        problem_type=ProblemType.TIRE,
        description="Flat tire",
    )
    db_session.add(chile_request)
    db_session.commit()

    headers = auth_header(seed_data.operator.firebase_uid)
    listed = api_client.get("/api/operator/service-requests", headers=headers)
    assert listed.status_code == 200
    assert chile_request.id not in {item["id"] for item in listed.json()}
    assert api_client.post(
        f"/api/operator/service-requests/{chile_request.id}/assign",
        headers=headers,
        json={"workshop_id": seed_data.workshops[0].id},
    ).status_code == 404
    assert api_client.post(
        f"/api/operator/service-requests/{seed_data.owner_request.id}/assign",
        headers=headers,
        json={"workshop_id": chile_workshop.id},
    ).status_code == 404


def test_admin_can_correct_tenant_only_before_request_history(api_client: TestClient, seed_data: SeedData) -> None:
    headers = auth_header(seed_data.admin.firebase_uid)
    changed = api_client.patch(
        f"/api/admin/users/{seed_data.operator.id}/tenant",
        headers=headers,
        json={"tenant_code": "CL"},
    )
    assert changed.status_code == 200
    assert changed.json()["tenant"] == {"code": "CL", "name": "Chile"}

    blocked = api_client.patch(
        f"/api/admin/users/{seed_data.owner.id}/tenant",
        headers=headers,
        json={"tenant_code": "CL"},
    )
    assert blocked.status_code == 409
    assert "cannot be changed" in blocked.json()["detail"]
