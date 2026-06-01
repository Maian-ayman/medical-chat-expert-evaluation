from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.migrations import migrate_expert_evaluations
from app.models import ExpertEvaluation  # noqa: F401 — register model
from app.routes.evaluation import router as evaluation_router

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"}


def _spa_page():
    return FileResponse(STATIC_DIR / "index.html", headers=NO_CACHE)


app = FastAPI(
    title="Expert Medical Chat Evaluation",
    description="واجهة تقييم المحادثات الطبية للأطباء الخبراء",
)

migrate_expert_evaluations()
Base.metadata.create_all(bind=engine, tables=[ExpertEvaluation.__table__])

app.include_router(evaluation_router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/api/health")
def health():
    return {"status": "ok"}


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
