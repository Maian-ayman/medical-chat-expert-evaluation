"""Copy chat_messages and expert_evaluations from hospital.db into PostgreSQL when needed."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import create_engine, func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import DATABASE_PATH, is_sqlite
from app.database import Base, engine
from app.models import ChatMessage, ExpertEvaluation

logger = logging.getLogger(__name__)

SQLITE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"


def _sqlite_message_count() -> int:
    if not DATABASE_PATH.is_file():
        return 0
    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    try:
        with Session(sqlite_engine) as session:
            return session.execute(select(func.count()).select_from(ChatMessage)).scalar() or 0
    finally:
        sqlite_engine.dispose()


def _postgres_message_count() -> int:
    with Session(engine) as session:
        return session.execute(select(func.count()).select_from(ChatMessage)).scalar() or 0


def seed_from_sqlite_if_needed() -> bool:
    """
    When the app uses PostgreSQL but chat_messages are missing, copy from hospital.db.
    Returns True if a migration ran.
    """
    if is_sqlite():
        return False
    if not DATABASE_PATH.is_file():
        logger.info("seed: hospital.db not found — skip")
        return False

    sqlite_count = _sqlite_message_count()
    if sqlite_count == 0:
        return False

    pg_count = _postgres_message_count()
    if pg_count >= sqlite_count:
        logger.info("seed: PostgreSQL already has %s chat_messages (sqlite %s)", pg_count, sqlite_count)
        return False

    logger.info(
        "seed: copying chat data from SQLite (%s messages) — PostgreSQL has %s",
        sqlite_count,
        pg_count,
    )
    migrate_sqlite_to_postgres()
    return True


def migrate_sqlite_to_postgres() -> None:
    """Bulk-copy chat_messages and expert_evaluations from hospital.db to the active PostgreSQL engine."""
    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

    Base.metadata.create_all(
        bind=engine, tables=[ChatMessage.__table__, ExpertEvaluation.__table__]
    )

    sqlite_sess = Session(sqlite_engine)
    pg_sess = Session(engine)

    try:
        existing_msg_ids = set(pg_sess.execute(select(ChatMessage.id)).scalars().all())
        sqlite_msgs = sqlite_sess.execute(select(ChatMessage).order_by(ChatMessage.id)).scalars().all()
        to_insert_msgs = [m for m in sqlite_msgs if m.id not in existing_msg_ids]

        batch_size = 500
        for i in range(0, len(to_insert_msgs), batch_size):
            batch = to_insert_msgs[i : i + batch_size]
            rows = [
                {
                    "id": m.id,
                    "session_id": m.session_id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at,
                }
                for m in batch
            ]
            stmt = pg_insert(ChatMessage).values(rows)
            stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
            pg_sess.execute(stmt)
            pg_sess.commit()

        if to_insert_msgs:
            pg_sess.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('chat_messages', 'id'), "
                    "(SELECT COALESCE(MAX(id), 1) FROM chat_messages))"
                )
            )
            pg_sess.commit()
            logger.info("seed: inserted %s chat_messages", len(to_insert_msgs))

        existing_eval_sessions = set(
            pg_sess.execute(select(ExpertEvaluation.session_id)).scalars().all()
        )
        sqlite_evals = sqlite_sess.execute(select(ExpertEvaluation)).scalars().all()
        to_insert_evals = [e for e in sqlite_evals if e.session_id not in existing_eval_sessions]

        for e in to_insert_evals:
            pg_sess.add(
                ExpertEvaluation(
                    session_id=e.session_id,
                    department_name=e.department_name,
                    clinical_relevance_score=e.clinical_relevance_score,
                    question_specificity_score=e.question_specificity_score,
                    single_question_score=e.single_question_score,
                    safety_score=e.safety_score,
                    linguistic_score=e.linguistic_score,
                    denial_handling_score=e.denial_handling_score,
                    department_accuracy_score=e.department_accuracy_score,
                    clinical_reasoning_score=e.clinical_reasoning_score,
                    doctor_notes=e.doctor_notes,
                    created_at=e.created_at or datetime.utcnow(),
                    updated_at=e.updated_at or datetime.utcnow(),
                )
            )
        pg_sess.commit()

        if to_insert_evals:
            pg_sess.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('expert_evaluations', 'id'), "
                    "(SELECT COALESCE(MAX(id), 1) FROM expert_evaluations))"
                )
            )
            pg_sess.commit()
            logger.info("seed: inserted %s expert_evaluations", len(to_insert_evals))

        final_msgs = pg_sess.execute(select(func.count()).select_from(ChatMessage)).scalar()
        final_evals = pg_sess.execute(select(func.count()).select_from(ExpertEvaluation)).scalar()
        logger.info("seed: done — chat_messages=%s expert_evaluations=%s", final_msgs, final_evals)
    finally:
        sqlite_sess.close()
        pg_sess.close()
        sqlite_engine.dispose()
