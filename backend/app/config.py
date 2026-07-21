from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://autoassist:autoassist@localhost:5433/autoassist"
    test_database_url: str = "postgresql+psycopg://autoassist:autoassist@localhost:5433/autoassist_test"
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"

    seed_owner_firebase_uid: str = "seed-owner-firebase-uid"
    seed_owner_email: str = "owner@example.com"
    seed_owner_name: str = "Test Owner"
    seed_operator_firebase_uid: str = "seed-operator-firebase-uid"
    seed_operator_email: str = "operator@example.com"
    seed_operator_name: str = "Test Operator"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
