"""Seed workshop records for local development."""

from __future__ import annotations

import logging
import sys
from collections.abc import Sequence

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models import Workshop

logger = logging.getLogger(__name__)

WORKSHOPS: Sequence[tuple[str, str, str]] = (
    ("AR", "Baterías Palermo", "Baterías"),
    ("AR", "Taller Norte", "Mecánica general"),
    ("AR", "Grúas Express", "Grúas"),
    ("CL", "Baterías Providencia", "Baterías"),
    ("CL", "Taller Santiago Norte", "Mecánica general"),
    ("CL", "Grúas Cordillera", "Grúas"),
)


def seed_workshops(session: Session) -> None:
    for tenant_code, name, specialty in WORKSHOPS:
        existing = session.scalar(
            select(Workshop).where(Workshop.name == name, Workshop.tenant_code == tenant_code)
        )
        if existing is not None:
            logger.info("Workshop already exists: %s", name)
            continue

        session.add(Workshop(name=name, specialty=specialty, tenant_code=tenant_code, active=True))
        logger.info("Created workshop: %s (%s)", name, tenant_code)


def run_seed() -> None:
    logging.basicConfig(level=settings.log_level, format="%(levelname)s %(message)s")

    engine = create_engine(settings.database_url, pool_pre_ping=True)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with session_factory() as session:
        seed_workshops(session)
        session.commit()

    engine.dispose()
    logger.info("Seed completed")


def main() -> int:
    try:
        run_seed()
    except Exception:
        logger.exception("Seed failed")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
