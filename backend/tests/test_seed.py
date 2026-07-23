from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.models import User, Workshop
from scripts.seed import WORKSHOPS, run_seed


def test_seed_creates_workshops_only(migrated_test_db, test_database_url, monkeypatch) -> None:
    monkeypatch.setattr("app.config.settings.database_url", test_database_url)
    run_seed()

    session_factory = sessionmaker(bind=migrated_test_db, autocommit=False, autoflush=False)
    with session_factory() as session:
        assert session.scalars(select(User)).all() == []
        workshops = session.scalars(select(Workshop).order_by(Workshop.id)).all()
        assert [(workshop.tenant_code, workshop.name) for workshop in workshops] == [
            (tenant_code, name) for tenant_code, name, _ in WORKSHOPS
        ]
        assert all(workshop.active for workshop in workshops)


def test_seed_is_idempotent(migrated_test_db, test_database_url, monkeypatch) -> None:
    monkeypatch.setattr("app.config.settings.database_url", test_database_url)
    run_seed()
    run_seed()

    session_factory = sessionmaker(bind=migrated_test_db, autocommit=False, autoflush=False)
    with session_factory() as session:
        assert len(session.scalars(select(Workshop)).all()) == len(WORKSHOPS)
