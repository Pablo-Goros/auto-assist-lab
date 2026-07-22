from alembic import command
from sqlalchemy import create_engine, inspect, text

from app.config import settings
from tests.conftest import get_alembic_config


def test_initial_migration_creates_expected_tables(migrated_test_db) -> None:
    inspector = inspect(migrated_test_db)
    table_names = set(inspector.get_table_names())
    assert {"users", "workshops", "service_requests"}.issubset(table_names)
    with migrated_test_db.connect() as connection:
        roles = connection.execute(
            text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'user_role'")
        ).scalars().all()
    assert roles == ["OWNER", "OPERATOR", "ADMIN"]


def test_migration_downgrade_and_reupgrade(test_database_url, monkeypatch) -> None:
    monkeypatch.setattr(settings, "database_url", test_database_url)
    alembic_config = get_alembic_config(test_database_url)
    engine = create_engine(test_database_url)

    command.downgrade(alembic_config, "base")

    with engine.connect() as connection:
        tables_after_downgrade = set(inspect(connection).get_table_names()) - {"alembic_version"}
        assert tables_after_downgrade == set()

    command.upgrade(alembic_config, "head")

    with engine.connect() as connection:
        table_names = set(inspect(connection).get_table_names())
        assert {"users", "workshops", "service_requests"}.issubset(table_names)

    command.downgrade(alembic_config, "base")
    engine.dispose()


def test_role_normalization_migration_converts_legacy_operator_and_admin(test_database_url, monkeypatch) -> None:
    monkeypatch.setattr(settings, "database_url", test_database_url)
    alembic_config = get_alembic_config(test_database_url)
    engine = create_engine(test_database_url)
    command.downgrade(alembic_config, "base")
    command.upgrade(alembic_config, "c3f5a8d7e921")

    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users (firebase_uid, email, name, role) VALUES "
                                "('legacy-owner', 'owner@example.test', 'Owner', 'OWNER'), "
                                "('legacy-operator', 'operator@example.test', 'Operator', 'OPERATOR'), "
                                "('legacy-admin', 'admin@example.test', 'Admin', 'ADMIN')"))

    command.upgrade(alembic_config, "head")
    with engine.connect() as connection:
        roles = connection.execute(text("SELECT firebase_uid, role::text FROM users ORDER BY firebase_uid")).all()
    assert roles == [
        ("legacy-admin", "OWNER"),
        ("legacy-operator", "OWNER"),
        ("legacy-owner", "OWNER"),
    ]

    command.downgrade(alembic_config, "base")
    engine.dispose()
