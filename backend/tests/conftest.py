
import os

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

# Load environment variables before importing the application.
load_dotenv()

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

if not TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL is missing from backend/.env"
    )

database_name = make_url(TEST_DATABASE_URL).database

if database_name != "kiranamitra_test":
    raise RuntimeError(
        f"Unsafe test database: {database_name}. "
        "Tests must use kiranamitra_test."
    )

# Import application and database dependencies.
from app.main import app
from app.database.session import get_db
from app.models.user import User
from app.core.security import create_access_token, hash_password


test_engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autoflush=False,
    autocommit=False
)


@pytest.fixture(scope="session", autouse=True)
def verify_test_database():
    """Ensure the test engine connects to the dedicated test database."""

    with test_engine.connect() as connection:
        actual_database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert actual_database == "kiranamitra_test"

    yield

    test_engine.dispose()


@pytest.fixture
def db_session():
    """Provide a transaction that is rolled back after each test."""

    connection = test_engine.connect()
    transaction = connection.begin()

    session = TestingSessionLocal(
        bind=connection,
        join_transaction_mode="create_savepoint"
    )

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    """Provide an authenticated test client using the test database."""

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Create a temporary owner for authenticated API tests.
    test_user = User(
        full_name="Test Store Owner",
        email="test-owner@kirana.local",
        hashed_password=hash_password("TestPassword123!"),
        is_active=True
    )

    db_session.add(test_user)
    db_session.flush()

    # Generate a JWT for the temporary test owner.
    access_token = create_access_token(
        data={"sub": str(test_user.id)}
    )

    try:
        with TestClient(app) as test_client:
            test_client.headers.update({
                "Authorization": f"Bearer {access_token}"
            })
            yield test_client
    finally:
        app.dependency_overrides.clear()
