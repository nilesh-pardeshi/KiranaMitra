from sqlalchemy import text
from app.database.connection import engine

try:
    with engine.connect() as connection:

        result = connection.execute(text("SELECT version()"))

        print("\nDATABASE CONNECTED SUCCESSFULLY!")

        print("\nPostgreSQL Version:")
        print(result.scalar())

except Exception as error:

    print("\nDATABASE CONNECTION FAILED!")
    print("Error:", error)