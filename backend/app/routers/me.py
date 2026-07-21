from fastapi import APIRouter

from app.auth import CurrentUser
from app.schemas.user import UserResponse

router = APIRouter(tags=["auth"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the authenticated application user",
    responses={
        401: {"description": "Missing or invalid authentication token"},
    },
)
def get_me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
