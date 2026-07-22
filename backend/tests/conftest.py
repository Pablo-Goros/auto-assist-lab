from __future__ import annotations

from collections.abc import Generator
from dataclasses import dataclass, field
from pathlib import Path
from unittest.mock import patch

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.auth import reset_auth_provider
from app.config import settings
from app.database import get_db
from app.main import app
from app.models import ProblemType, ServiceRequest, ServiceRequestStatus, User, UserRole, Workshop
from app.services.pubsub import EventPublisher, ServiceRequestAssignedEvent, reset_event_publisher

BACKEND_DIR = Path(__file__).resolve().parents[1]
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"


def get_alembic_config(database_url: str) -> Config:
    config = Config(str(ALEMBIC_INI))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def ensure_database_exists(database_url: str) -> None:
    admin_url = database_url.rsplit("/", 1)[0] + "/postgres"
    db_name = database_url.rsplit("/", 1)[1]
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as connection:
        exists = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
            {"db_name": db_name},
        ).scalar()
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{db_name}"'))
    engine.dispose()


class RecordingEventPublisher:
    def __init__(self) -> None:
        self.events: list[ServiceRequestAssignedEvent] = []
        self.should_fail = False
        self.committed_before_publish = False

    def publish_service_request_assigned(self, event: ServiceRequestAssignedEvent) -> None:
        if self.should_fail:
            raise RuntimeError("publish failed")
        self.events.append(event)


@dataclass
class SeedData:
    owner: User
    operator: User
    admin: User
    other_owner: User
    workshops: list[Workshop] = field(default_factory=list)
    owner_request: ServiceRequest | None = None
    other_owner_request: ServiceRequest | None = None


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_db_connection() -> Generator[None, None, None]:
    with patch("app.main.check_database_connection"):
        yield


@pytest.fixture(scope="session")
def test_database_url() -> str:
    return settings.test_database_url


@pytest.fixture(scope="session")
def test_db_engine(test_database_url: str) -> Generator[Engine, None, None]:
    ensure_database_exists(test_database_url)
    engine = create_engine(test_database_url, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture
def migrated_test_db(
    test_database_url: str,
    test_db_engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[Engine, None, None]:
    monkeypatch.setattr(settings, "database_url", test_database_url)
    alembic_config = get_alembic_config(test_database_url)
    command.downgrade(alembic_config, "base")
    command.upgrade(alembic_config, "head")
    yield test_db_engine
    with test_db_engine.begin() as connection:
        connection.execute(text("DELETE FROM users WHERE role::text = 'ADMIN'"))
    command.downgrade(alembic_config, "base")


@pytest.fixture
def db_session(migrated_test_db: Engine) -> Generator[Session, None, None]:
    session_factory = sessionmaker(bind=migrated_test_db, autocommit=False, autoflush=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def event_publisher() -> RecordingEventPublisher:
    publisher = RecordingEventPublisher()
    reset_event_publisher()
    from app.services import pubsub

    pubsub.set_event_publisher(publisher)
    yield publisher
    reset_event_publisher()


@pytest.fixture
def api_client(
    db_session: Session,
    event_publisher: RecordingEventPublisher,
) -> Generator[TestClient, None, None]:
    reset_auth_provider()

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    reset_auth_provider()


@pytest.fixture
def seed_data(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> SeedData:
    monkeypatch.setattr(settings, "admin_firebase_uid", "admin-test-uid")
    owner = User(
        firebase_uid="owner-test-uid",
        email="owner@test.example",
        name="Owner Test",
        role=UserRole.OWNER,
    )
    other_owner = User(
        firebase_uid="other-owner-test-uid",
        email="other-owner@test.example",
        name="Other Owner",
        role=UserRole.OWNER,
    )
    operator = User(
        firebase_uid="operator-test-uid",
        email="operator@test.example",
        name="Operator Test",
        role=UserRole.OPERATOR,
    )
    admin = User(
        firebase_uid="admin-test-uid",
        email="admin@test.example",
        name="Admin Test",
        role=UserRole.ADMIN,
    )
    workshops = [
        Workshop(name="Active Workshop", specialty="BATTERY", active=True),
        Workshop(name="Inactive Workshop", specialty="TIRE", active=False),
    ]

    db_session.add_all([owner, other_owner, operator, admin, *workshops])
    db_session.flush()

    owner_request = ServiceRequest(
        owner_id=owner.id,
        vehicle="Honda Civic 2013",
        problem_type=ProblemType.BATTERY,
        description="No arranca",
        status=ServiceRequestStatus.PENDING,
    )
    other_owner_request = ServiceRequest(
        owner_id=other_owner.id,
        vehicle="Toyota Corolla 2018",
        problem_type=ProblemType.TIRE,
        description="Pinchazo",
        status=ServiceRequestStatus.PENDING,
    )
    db_session.add_all([owner_request, other_owner_request])
    db_session.commit()

    for entity in (owner, other_owner, operator, admin, owner_request, other_owner_request, *workshops):
        db_session.refresh(entity)

    return SeedData(
        owner=owner,
        operator=operator,
        admin=admin,
        other_owner=other_owner,
        workshops=workshops,
        owner_request=owner_request,
        other_owner_request=other_owner_request,
    )


def auth_header(firebase_uid: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {firebase_uid}"}
