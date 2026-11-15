
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.database.connection import engine
from app.routers import (
    products,
    suppliers,
    purchases,
    customers,
    sales,
    reports,
    auth,
)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Smart Kirana Store Management System",
    version="1.0.0"
)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

# Set FRONTEND_URL in Render after deploying the frontend.
# Multiple URLs can be separated by commas.
frontend_urls = os.getenv("FRONTEND_URL", "")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if frontend_urls:
    allowed_origins.extend(
        origin.strip().rstrip("/")
        for origin in frontend_urls.split(",")
        if origin.strip()
    )

# Remove duplicate origins.
allowed_origins = list(set(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# PROFILE IMAGE STORAGE
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)


# --------------------------------------------------
# API ROUTERS
# --------------------------------------------------

app.include_router(products.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(purchases.router)
app.include_router(sales.router)
app.include_router(reports.router)
app.include_router(auth.router)


# --------------------------------------------------
# HOME ROUTE
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to KiranaMitra API",
        "status": "Running",
        "version": "1.0.0"
    }


# --------------------------------------------------
# APPLICATION HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "KiranaMitra"
    }


# --------------------------------------------------
# DATABASE HEALTH CHECK
# --------------------------------------------------

@app.get("/health/database")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "connected",
            "database": "PostgreSQL"
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed"
        )
