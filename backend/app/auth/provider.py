from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class AuthenticatedIdentity:
    firebase_uid: str
    email: str | None = None
    name: str | None = None


class AuthProvider(Protocol):
    def verify_token(self, token: str) -> AuthenticatedIdentity:
        """Validate a bearer token and return the authenticated identity."""


class StubAuthProvider:
    """Development and test auth: the bearer token value is treated as firebase_uid.

    Phase 5 replaces this with Firebase Admin SDK verification.
    """

    def verify_token(self, token: str) -> AuthenticatedIdentity:
        if not token.strip():
            raise ValueError("Invalid authentication token")
        return AuthenticatedIdentity(firebase_uid=token.strip())
