from pathlib import Path
from typing import cast

import pytest
from firebase_admin import App, auth as firebase_auth

from app.auth.provider import FirebaseAuthProvider


def provider_without_credentials() -> FirebaseAuthProvider:
    provider = FirebaseAuthProvider("test-project", Path("unused.json"))
    provider._app = cast(App, object())
    return provider


def test_firebase_provider_returns_verified_identity(monkeypatch: pytest.MonkeyPatch) -> None:
    provider = provider_without_credentials()
    monkeypatch.setattr(
        firebase_auth,
        "verify_id_token",
        lambda token, *, app: {
            "uid": "firebase-user-123",
            "email": "owner@example.com",
            "name": "Owner Example",
        },
    )

    identity = provider.verify_token(" signed-id-token ")

    assert identity.firebase_uid == "firebase-user-123"
    assert identity.email == "owner@example.com"
    assert identity.name == "Owner Example"


def test_firebase_provider_rejects_invalid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    provider = provider_without_credentials()

    def reject_token(token: str, *, app: App) -> None:
        raise ValueError("malformed token")

    monkeypatch.setattr(firebase_auth, "verify_id_token", reject_token)

    with pytest.raises(ValueError, match="Invalid authentication token"):
        provider.verify_token("not-a-firebase-token")


def test_firebase_provider_rejects_token_without_uid(monkeypatch: pytest.MonkeyPatch) -> None:
    provider = provider_without_credentials()
    monkeypatch.setattr(firebase_auth, "verify_id_token", lambda token, *, app: {"email": "x@example.com"})

    with pytest.raises(ValueError, match="Invalid authentication token"):
        provider.verify_token("signed-id-token")
