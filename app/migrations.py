from sqlalchemy import inspect as sa_inspect, text

from app.config import is_sqlite
from app.database import engine


def migrate_expert_evaluations():
    """SQLite-only legacy migration. No-op on PostgreSQL."""
    if not is_sqlite():
        return

    inspector = sa_inspect(engine)
    if "expert_evaluations" not in inspector.get_table_names():
        return

    cols = {c["name"] for c in inspector.get_columns("expert_evaluations")}
    if "evaluator_id" not in cols:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE expert_evaluations_shared (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL UNIQUE,
                    department_name VARCHAR(128) NOT NULL,
                    clinical_relevance_score INTEGER,
                    question_specificity_score INTEGER,
                    single_question_score INTEGER,
                    safety_score INTEGER,
                    linguistic_score INTEGER,
                    denial_handling_score INTEGER,
                    department_accuracy_score INTEGER,
                    clinical_reasoning_score INTEGER,
                    doctor_notes TEXT,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    CONSTRAINT uq_expert_eval_session UNIQUE (session_id)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO expert_evaluations_shared (
                    session_id, department_name,
                    clinical_relevance_score, question_specificity_score,
                    single_question_score, safety_score, linguistic_score,
                    denial_handling_score, department_accuracy_score,
                    clinical_reasoning_score, doctor_notes, created_at, updated_at
                )
                SELECT
                    session_id, department_name,
                    clinical_relevance_score, question_specificity_score,
                    single_question_score, safety_score, linguistic_score,
                    denial_handling_score, department_accuracy_score,
                    clinical_reasoning_score, doctor_notes, created_at, updated_at
                FROM expert_evaluations
                WHERE id IN (
                    SELECT id FROM expert_evaluations e
                    WHERE e.updated_at = (
                        SELECT MAX(updated_at) FROM expert_evaluations
                        WHERE session_id = e.session_id
                    )
                )
                """
            )
        )
        conn.execute(text("DROP TABLE expert_evaluations"))
        conn.execute(text("ALTER TABLE expert_evaluations_shared RENAME TO expert_evaluations"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_expert_evaluations_session_id "
                "ON expert_evaluations (session_id)"
            )
        )
