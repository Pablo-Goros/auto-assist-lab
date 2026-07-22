from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ServiceRequestStatus, Workshop
from tests.conftest import SeedData, auth_header


def test_me_requires_authentication(api_client: TestClient) -> None:
    response = api_client.get("/api/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authentication token"


def test_me_rejects_unregistered_user(api_client: TestClient) -> None:
    response = api_client.get("/api/me", headers=auth_header("unknown-uid"))
    assert response.status_code == 401
    assert response.json()["detail"] == "User not registered"


def test_me_returns_current_user(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.get("/api/me", headers=auth_header(seed_data.owner.firebase_uid))

    assert response.status_code == 200
    assert response.json() == {
        "id": seed_data.owner.id,
        "firebase_uid": seed_data.owner.firebase_uid,
        "email": seed_data.owner.email,
        "name": seed_data.owner.name,
        "role": "OWNER",
    }


def test_me_returns_admin_role(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.get("/api/me", headers=auth_header(seed_data.admin.firebase_uid))

    assert response.status_code == 200
    assert response.json()["role"] == "ADMIN"


def test_admin_has_no_owner_or_operator_permissions(
    api_client: TestClient,
    seed_data: SeedData,
) -> None:
    headers = auth_header(seed_data.admin.firebase_uid)

    assert api_client.get("/api/service-requests/me", headers=headers).status_code == 403
    assert api_client.get("/api/operator/service-requests", headers=headers).status_code == 403


def test_owner_creates_service_request(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.post(
        "/api/service-requests",
        headers=auth_header(seed_data.owner.firebase_uid),
        json={
            "vehicle": "Ford Focus 2015",
            "problem_type": "MECHANICAL",
            "description": "Ruido en el motor",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["vehicle"] == "Ford Focus 2015"
    assert body["problem_type"] == "MECHANICAL"
    assert body["status"] == "PENDING"
    assert body["assigned_workshop"] is None
    assert body["assigned_at"] is None


def test_operator_cannot_create_service_request(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.post(
        "/api/service-requests",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={
            "vehicle": "Ford Focus 2015",
            "problem_type": "MECHANICAL",
            "description": "Ruido en el motor",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions"


def test_owner_lists_only_own_requests(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.get(
        "/api/service-requests/me",
        headers=auth_header(seed_data.owner.firebase_uid),
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == seed_data.owner_request.id
    assert body[0]["vehicle"] == seed_data.owner_request.vehicle


def test_operator_lists_all_requests(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.get(
        "/api/operator/service-requests",
        headers=auth_header(seed_data.operator.firebase_uid),
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    request_ids = {item["id"] for item in body}
    assert request_ids == {seed_data.owner_request.id, seed_data.other_owner_request.id}
    owner_entry = next(item for item in body if item["id"] == seed_data.owner_request.id)
    assert owner_entry["owner"]["email"] == seed_data.owner.email


def test_owner_cannot_access_operator_endpoints(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.get(
        "/api/operator/service-requests",
        headers=auth_header(seed_data.owner.firebase_uid),
    )
    assert response.status_code == 403


def test_operator_lists_active_workshops_only(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.get("/api/workshops", headers=auth_header(seed_data.operator.firebase_uid))

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "Active Workshop"
    assert body[0]["active"] is True


def test_operator_assigns_workshop(
    api_client: TestClient,
    seed_data: SeedData,
    event_publisher,
) -> None:
    active_workshop = seed_data.workshops[0]
    response = api_client.post(
        f"/api/operator/service-requests/{seed_data.owner_request.id}/assign",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={"workshop_id": active_workshop.id},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ASSIGNED"
    assert body["assigned_workshop"]["id"] == active_workshop.id
    assert body["assigned_at"] is not None
    assert len(event_publisher.events) == 1
    assert event_publisher.events[0].request_id == seed_data.owner_request.id
    assert event_publisher.events[0].workshop_id == active_workshop.id


def test_assignment_publishes_after_commit(
    api_client: TestClient,
    seed_data: SeedData,
    db_session: Session,
    event_publisher,
) -> None:
    active_workshop = seed_data.workshops[0]
    response = api_client.post(
        f"/api/operator/service-requests/{seed_data.owner_request.id}/assign",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={"workshop_id": active_workshop.id},
    )

    assert response.status_code == 200
    db_session.refresh(seed_data.owner_request)
    assert seed_data.owner_request.status == ServiceRequestStatus.ASSIGNED
    assert len(event_publisher.events) == 1


def test_assign_missing_request_returns_404(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.post(
        "/api/operator/service-requests/99999/assign",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={"workshop_id": seed_data.workshops[0].id},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Service request not found"


def test_assign_missing_workshop_returns_404(api_client: TestClient, seed_data: SeedData) -> None:
    response = api_client.post(
        f"/api/operator/service-requests/{seed_data.owner_request.id}/assign",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={"workshop_id": 99999},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workshop not found"


def test_assign_inactive_workshop_returns_400(api_client: TestClient, seed_data: SeedData) -> None:
    inactive_workshop = seed_data.workshops[1]
    response = api_client.post(
        f"/api/operator/service-requests/{seed_data.owner_request.id}/assign",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={"workshop_id": inactive_workshop.id},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Workshop is inactive"


def test_reassignment_updates_workshop_and_publishes_again(
    api_client: TestClient,
    seed_data: SeedData,
    db_session: Session,
    event_publisher,
) -> None:
    active_workshop = seed_data.workshops[0]
    second_workshop = Workshop(name="Second Workshop", specialty="TOWING", active=True)
    db_session.add(second_workshop)
    db_session.commit()
    db_session.refresh(second_workshop)

    first = api_client.post(
        f"/api/operator/service-requests/{seed_data.owner_request.id}/assign",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={"workshop_id": active_workshop.id},
    )
    second = api_client.post(
        f"/api/operator/service-requests/{seed_data.owner_request.id}/assign",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={"workshop_id": second_workshop.id},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["assigned_workshop"]["id"] == second_workshop.id
    assert len(event_publisher.events) == 2


def test_publish_failure_returns_500_but_persists_assignment(
    api_client: TestClient,
    seed_data: SeedData,
    db_session: Session,
    event_publisher,
) -> None:
    event_publisher.should_fail = True
    active_workshop = seed_data.workshops[0]

    response = api_client.post(
        f"/api/operator/service-requests/{seed_data.owner_request.id}/assign",
        headers=auth_header(seed_data.operator.firebase_uid),
        json={"workshop_id": active_workshop.id},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to publish assignment event"
    db_session.refresh(seed_data.owner_request)
    assert seed_data.owner_request.status == ServiceRequestStatus.ASSIGNED
    assert seed_data.owner_request.assigned_workshop_id == active_workshop.id
