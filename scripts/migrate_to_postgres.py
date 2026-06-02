"""
Migrate chat_messages and expert_evaluations from hospital.db (SQLite) to PostgreSQL.

Usage (PowerShell):
  $env:DATABASE_URL = "postgresql+psycopg2://USER:PASSWORD@localhost:5432/hospital"
  python scripts/migrate_to_postgres.py

On Render: set DATABASE_URL — migration also runs automatically on app startup if chats are missing.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Must set DATABASE_URL before importing app modules that read config
if not os.getenv("DATABASE_URL") or os.getenv("DATABASE_URL", "").startswith("sqlite"):
    print("ERROR: Set DATABASE_URL to your PostgreSQL connection string.")
    print('Example: postgresql+psycopg2://postgres:password@localhost:5432/hospital')
    sys.exit(1)

from app.config import DATABASE_PATH, DATABASE_URL, is_sqlite
from app.seed_from_sqlite import migrate_sqlite_to_postgres


def main():
    print("SQLite:", DATABASE_PATH)
    print("PostgreSQL:", DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL)
    if is_sqlite():
        print("ERROR: DATABASE_URL still points to SQLite.")
        sys.exit(1)
    migrate_sqlite_to_postgres()
    print("Done.")


if __name__ == "__main__":
    main()
