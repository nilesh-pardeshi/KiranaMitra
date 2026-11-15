import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

database_url = os.getenv("TEST_DATABASE_URL")

if not database_url:
    raise ValueError("TEST_DATABASE_URL is missing from .env")

engine = create_engine(database_url)

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT current_database()"))
        print("Connected database:", result.scalar())
        print("TEST DATABASE CONNECTION SUCCESSFUL!")

except Exception as error:
    print("DATABASE CONNECTION FAILED!")
    print(error)

finally:
    engine.dispose()