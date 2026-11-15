
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.session import get_db
from app.models.user import User


# Return None instead of automatically raising 403
# when the Authorization header is missing.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"}
    )

    # Check whether the token was provided.
    if credentials is None:
        raise credentials_exception

    # Decode and validate JWT.
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise credentials_exception

    # Extract user ID.
    user_id = payload.get("sub")

    if not user_id:
        raise credentials_exception

    try:
        user_id = int(user_id)

        if user_id <= 0:
            raise credentials_exception

    except (ValueError, TypeError):
        raise credentials_exception

    # Find the authenticated user.
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise credentials_exception

    # Prevent inactive accounts from accessing protected routes.
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user
