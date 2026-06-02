import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "hospital.db"

# PostgreSQL on Render/local: set DATABASE_URL in environment
# Example: postgresql+psycopg2://user:password@localhost:5432/hospital


def normalize_database_url(url: str) -> str:
    """Render uses postgres:// — SQLAlchemy needs postgresql+psycopg2://."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://") and "+psycopg2" not in url and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


_default_sqlite = f"sqlite:///{DATABASE_PATH.as_posix()}"
DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", _default_sqlite))

DEPARTMENTS = [
    {
        "key": "neurology",
        "name_ar": "طب الأعصاب",
        "name_en": "Neurology",
        "session_start": 157,
        "session_end": 177,
    },
    {
        "key": "ophthalmology",
        "name_ar": "طب العيون",
        "name_en": "Ophthalmology",
        "session_start": 178,
        "session_end": 197,
    },
    {
        "key": "ent",
        "name_ar": "الأنف والأذن والحنجرة",
        "name_en": "ENT",
        "session_start": 198,
        "session_end": 217,
    },
    {
        "key": "gi",
        "name_ar": "أمراض الجهاز الهضمي",
        "name_en": "Gastroenterology",
        "session_start": 219,
        "session_end": 238,
    },
    {
        "key": "pulmonary",
        "name_ar": "أمراض الصدر",
        "name_en": "Pulmonology",
        "session_start": 239,
        "session_end": 258,
    },
]

DEPARTMENT_BY_KEY = {d["key"]: d for d in DEPARTMENTS}


def department_for_session(session_id: int) -> dict | None:
    for dept in DEPARTMENTS:
        if dept["session_start"] <= session_id <= dept["session_end"]:
            return dept
    return None


def is_sqlite() -> bool:
    return DATABASE_URL.startswith("sqlite")
