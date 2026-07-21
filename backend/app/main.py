import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import check_database_connection
from app.routers import me, operator, service_requests, workshops

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("AutoAssist Mini API starting")
    yield


app = FastAPI(
    title="AutoAssist Mini API",
    description=(
        "Service request management API for owners and operators. "
        "Protected endpoints require `Authorization: Bearer <token>`. "
        "During Phase 3 the bearer token value is treated as the seeded "
        "`firebase_uid` until Firebase Admin verification is added in Phase 5."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(me.router)
api_router.include_router(service_requests.router)
api_router.include_router(operator.router)
api_router.include_router(workshops.router)


@api_router.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """Verify that the API and database are reachable."""
    check_database_connection()
    return {"status": "ok"}


app.include_router(api_router)
