from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Protocol

import firebase_admin
from firebase_admin import App, auth as firebase_auth, credentials


@dataclass(frozen=True, slots=True)
class AuthenticatedIdentity:
    firebase_uid: str
    email: str | None = None
    name: str | None = None


class AuthProvider(Protocol):
    def verify_token(self, token: str) -> AuthenticatedIdentity:
        """Validate a bearer token and return the authenticated identity."""


class StubAuthProvider:
    """Test auth: the bearer token value is treated as firebase_uid."""

    def verify_token(self, token: str) -> AuthenticatedIdentity:
        firebase_uid = token.strip()
        if not firebase_uid:
            raise ValueError("Invalid authentication token")
        return AuthenticatedIdentity(
            firebase_uid=firebase_uid,
            email=f"{firebase_uid}@test.example",
            name=firebase_uid,
        )


class FirebaseAuthProvider:
    """Verify Firebase ID tokens and expose only trusted identity claims."""

    _app_name = "autoassist"

    def __init__(self, project_id: str, credential_path: Path | None = None) -> None:
        self._project_id = project_id
        self._credential_path = credential_path
        self._app: App | None = None
        self._initialization_lock = Lock()

    def _get_app(self) -> App:
        if self._app is not None:
            return self._app

        with self._initialization_lock:
            if self._app is not None:
                return self._app
            try:
                self._app = firebase_admin.get_app(self._app_name)
            except ValueError:
                credential = (
                    credentials.Certificate(str(self._credential_path))
                    if self._credential_path is not None
                    else None
                )
                self._app = firebase_admin.initialize_app(
                    credential=credential,
                    options={"projectId": self._project_id},
                    name=self._app_name,
                )
            return self._app

    def verify_token(self, token: str) -> AuthenticatedIdentity:
        normalized_token = token.strip()
        if not normalized_token:
            raise ValueError("Invalid authentication token")

        app = self._get_app()
        try:
            decoded_token = firebase_auth.verify_id_token(normalized_token, app=app)
        except (
            ValueError,
            firebase_auth.InvalidIdTokenError,
            firebase_auth.ExpiredIdTokenError,
            firebase_auth.RevokedIdTokenError,
            firebase_auth.UserDisabledError,
        ) as exc:
            raise ValueError("Invalid authentication token") from exc

        firebase_uid = decoded_token.get("uid")
        if not isinstance(firebase_uid, str) or not firebase_uid:
            raise ValueError("Invalid authentication token")

        email = decoded_token.get("email")
        name = decoded_token.get("name")
        return AuthenticatedIdentity(
            firebase_uid=firebase_uid,
            email=email if isinstance(email, str) else None,
            name=name if isinstance(name, str) else None,
        )
