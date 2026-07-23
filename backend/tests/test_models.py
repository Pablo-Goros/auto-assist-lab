from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    ProblemType,
    ServiceRequest,
    ServiceRequestStatus,
    User,
    UserRole,
    Workshop,
)


def test_user_firebase_uid_must_be_unique(db_session: Session) -> None:
    db_session.add(
        User(
            firebase_uid="duplicate-uid",
            email="first@example.com",
            name="First User",
            role=UserRole.OWNER,
            tenant_code="AR",
        )
    )
    db_session.commit()

    db_session.add(
        User(
            firebase_uid="duplicate-uid",
            email="second@example.com",
            name="Second User",
            role=UserRole.OPERATOR,
            tenant_code="AR",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_service_request_defaults_to_pending(db_session: Session) -> None:
    owner = User(
        firebase_uid="owner-defaults",
        email="owner@example.com",
        name="Owner",
        role=UserRole.OWNER,
        tenant_code="AR",
    )
    db_session.add(owner)
    db_session.commit()

    request = ServiceRequest(
        owner_id=owner.id,
        tenant_code="AR",
        vehicle="Honda Civic 2013",
        problem_type=ProblemType.BATTERY,
        description="El auto no arranca",
    )
    db_session.add(request)
    db_session.commit()
    db_session.refresh(request)

    assert request.status == ServiceRequestStatus.PENDING
    assert request.assigned_workshop_id is None
    assert request.assigned_at is None
    assert request.created_at is not None
    assert request.created_at.tzinfo is not None


def test_service_request_relationships(db_session: Session) -> None:
    owner = User(
        firebase_uid="owner-rel",
        email="owner-rel@example.com",
        name="Owner Rel",
        role=UserRole.OWNER,
        tenant_code="AR",
    )
    workshop = Workshop(name="Taller Test", specialty="Baterías", tenant_code="AR", active=True)
    db_session.add_all([owner, workshop])
    db_session.commit()

    assigned_at = datetime(2026, 7, 21, 14, 0, tzinfo=UTC)
    request = ServiceRequest(
        owner_id=owner.id,
        tenant_code="AR",
        vehicle="Toyota Corolla 2018",
        problem_type=ProblemType.TIRE,
        description="Pinchazo en ruta",
        status=ServiceRequestStatus.ASSIGNED,
        assigned_workshop_id=workshop.id,
        assigned_at=assigned_at,
    )
    db_session.add(request)
    db_session.commit()
    db_session.refresh(request)

    assert request.owner.firebase_uid == "owner-rel"
    assert request.assigned_workshop is not None
    assert request.assigned_workshop.name == "Taller Test"
    assert owner.service_requests[0].id == request.id
    assert workshop.service_requests[0].id == request.id


def test_workshop_active_defaults_to_true(db_session: Session) -> None:
    workshop = Workshop(name="Activo por defecto", specialty="Mecánica", tenant_code="AR")
    db_session.add(workshop)
    db_session.commit()
    db_session.refresh(workshop)

    assert workshop.active is True


def test_service_request_requires_existing_owner(db_session: Session) -> None:
    request = ServiceRequest(
        owner_id=9999,
        tenant_code="AR",
        vehicle="Ford Focus 2015",
        problem_type=ProblemType.OTHER,
        description="Falla desconocida",
    )
    db_session.add(request)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_service_request_rejects_a_workshop_from_another_tenant(db_session: Session) -> None:
    owner = User(
        firebase_uid="ar-owner",
        email="ar-owner@example.com",
        name="Argentina Owner",
        role=UserRole.OWNER,
        tenant_code="AR",
    )
    chile_workshop = Workshop(
        name="Chile only workshop",
        specialty="TIRE",
        tenant_code="CL",
        active=True,
    )
    db_session.add_all([owner, chile_workshop])
    db_session.commit()

    db_session.add(
        ServiceRequest(
            owner_id=owner.id,
            tenant_code="AR",
            vehicle="Ford Focus",
            problem_type=ProblemType.TIRE,
            description="Flat tire",
            assigned_workshop_id=chile_workshop.id,
            status=ServiceRequestStatus.ASSIGNED,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_enum_values_are_persisted(db_session: Session) -> None:
    owner = User(
        firebase_uid="owner-enum",
        email="owner-enum@example.com",
        name="Owner Enum",
        role=UserRole.OPERATOR,
        tenant_code="AR",
    )
    db_session.add(owner)
    db_session.commit()

    stored_role = db_session.scalar(select(User.role).where(User.id == owner.id))
    assert stored_role == UserRole.OPERATOR
