from sqlalchemy import inspect as sa_inspect, text

from app.database import engine


def migrate_expert_evaluations():
    """Add evaluator_id so each browser/user has their own evaluations."""
    inspector = sa_inspect(engine)
    tables = inspector.get_table_names()
    if "expert_evaluations" not in tables:
        return

    cols = {c["name"] for c in inspector.get_columns("expert_evaluations")}
    if "evaluator_id" in cols:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE expert_evaluations_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    evaluator_id VARCHAR(64) NOT NULL,
                    session_id INTEGER NOT NULL,
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
                    CONSTRAINT uq_expert_eval_session_evaluator UNIQUE (session_id, evaluator_id)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO expert_evaluations_new (
                    id, evaluator_id, session_id, department_name,
                    clinical_relevance_score, question_specificity_score,
                    single_question_score, safety_score, linguistic_score,
                    denial_handling_score, department_accuracy_score,
                    clinical_reasoning_score, doctor_notes, created_at, updated_at
                )
                SELECT
                    id, 'legacy', session_id, department_name,
                    clinical_relevance_score, question_specificity_score,
                    single_question_score, safety_score, linguistic_score,
                    denial_handling_score, department_accuracy_score,
                    clinical_reasoning_score, doctor_notes, created_at, updated_at
                FROM expert_evaluations
                """
            )
        )
        conn.execute(text("DROP TABLE expert_evaluations"))
        conn.execute(text("ALTER TABLE expert_evaluations_new RENAME TO expert_evaluations"))
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_expert_evaluations_session_id "
                "ON expert_evaluations (session_id)"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_expert_evaluations_evaluator_id "
                "ON expert_evaluations (evaluator_id)"
            )
        )
