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

WORKSHOPS: Sequence[tuple[str, str]] = (
    ("Baterías Palermo", "Baterías"),
    ("Taller Norte", "Mecánica general"),
    ("Grúas Express", "Grúas"),
)


def seed_workshops(session: Session) -> None:
    for name, specialty in WORKSHOPS:
        existing = session.scalar(select(Workshop).where(Workshop.name == name))
        if existing is not None:
            logger.info("Workshop already exists: %s", name)
            continue

        session.add(Workshop(name=name, specialty=specialty, active=True))
        logger.info("Created workshop: %s", name)


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
