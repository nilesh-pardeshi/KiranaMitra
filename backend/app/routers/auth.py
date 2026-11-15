
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File
)
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserProfileUpdate,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

MAX_IMAGE_SIZE = 5 * 1024 * 1024


# REGISTER STORE OWNER
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    data: UserRegister,
    db: Session = Depends(get_db)
):
    # Allow registration only if no account exists.
    existing_account = db.query(User.id).first()

    if existing_account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store owner account already exists. Public registration is disabled."
        )

    email = str(data.email).lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered"
        )

    user = User(
        full_name=data.full_name.strip(),
        email=email,
        hashed_password=hash_password(data.password),
        is_active=True
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

        return user

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to register user"
        )


# LOGIN
@router.post(
    "/login",
    response_model=TokenResponse
)
def login_user(
    data: UserLogin,
    db: Session = Depends(get_db)
):
    email = str(data.email).lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user or not verify_password(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token = create_access_token(
        data={"sub": str(user.id)}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


# GET CURRENT USER PROFILE
@router.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


# UPDATE CURRENT USER PROFILE
@router.patch(
    "/me",
    response_model=UserResponse
)
def update_my_profile(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()

    if data.email is not None:
        new_email = str(data.email).lower()

        existing_user = (
            db.query(User)
            .filter(
                User.email == new_email,
                User.id != current_user.id
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered"
            )

        current_user.email = new_email

    try:
        db.commit()
        db.refresh(current_user)
        return current_user

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update profile"
        )


# UPLOAD PROFILE IMAGE
@router.post(
    "/me/profile-image",
    response_model=UserResponse
)
async def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        allowed_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JPG, PNG and WEBP images are allowed"
            )

        # Read at most 5 MB + 1 byte.
        # This prevents loading arbitrarily large files into memory.
        image_data = await file.read(MAX_IMAGE_SIZE + 1)

        if not image_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image file"
            )

        if len(image_data) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image size must not exceed 5 MB"
            )

        # Verify actual file signatures.
        valid_signatures = {
            "image/jpeg": image_data.startswith(b"\xff\xd8\xff"),
            "image/png": image_data.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/webp": (
                len(image_data) >= 12
                and image_data.startswith(b"RIFF")
                and image_data[8:12] == b"WEBP"
            ),
        }

        if not valid_signatures[file.content_type]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file"
            )

        extension = allowed_types[file.content_type]
        filename = f"{uuid4().hex}{extension}"

        upload_dir = (
            Path(__file__).resolve().parents[2]
            / "uploads"
            / "profiles"
        )

        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / filename

        try:
            file_path.write_bytes(image_data)

            current_user.profile_image_url = (
                f"/uploads/profiles/{filename}"
            )

            db.commit()
            db.refresh(current_user)

            return current_user

        except Exception:
            db.rollback()

            if file_path.exists():
                file_path.unlink()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to upload profile image"
            )

    finally:
        await file.close()
