"""Pub/Sub notification worker entry point (implemented in Phase 6)."""

import logging

from app.config import settings

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("AutoAssist Mini worker skeleton ready")


if __name__ == "__main__":
    main()
