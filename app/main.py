from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select

from app.config import is_sqlite
from app.database import Base, engine
from app.migrations import migrate_expert_evaluations
from app.models import ChatMessage, ExpertEvaluation  # noqa: F401 — register models
from app.routes.evaluation import router as evaluation_router
from app.seed_from_sqlite import seed_from_sqlite_if_needed

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"}


def _spa_page():
    return FileResponse(STATIC_DIR / "index.html", headers=NO_CACHE)


app = FastAPI(
    title="Expert Medical Chat Evaluation",
    description="واجهة تقييم المحادثات الطبية للأطباء الخبراء",
)

migrate_expert_evaluations()
Base.metadata.create_all(bind=engine, tables=[ChatMessage.__table__, ExpertEvaluation.__table__])
seed_from_sqlite_if_needed()

app.include_router(evaluation_router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/api/health")
def health():
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        msg_count = db.execute(select(func.count()).select_from(ChatMessage)).scalar() or 0
        eval_count = db.execute(select(func.count()).select_from(ExpertEvaluation)).scalar() or 0
    finally:
        db.close()
    return {
        "status": "ok",
        "database": "sqlite" if is_sqlite() else "postgresql",
        "chat_messages": msg_count,
        "expert_evaluations": eval_count,
    }


@app.get("/")
def home():
    return _spa_page()


@app.get("/department/{dept_key}")
def department_page(dept_key: str):
    return _spa_page()


@app.get("/case/{session_id}")
def case_page(session_id: int):
    return _spa_page()


@app.get("/evaluations")
def evaluations_page():
    return _spa_page()
