from alembic import command
from sqlalchemy import create_engine, inspect

from app.config import settings
from tests.conftest import get_alembic_config


def test_initial_migration_creates_expected_tables(migrated_test_db) -> None:
    inspector = inspect(migrated_test_db)
    table_names = set(inspector.get_table_names())
    assert {"users", "workshops", "service_requests"}.issubset(table_names)


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
