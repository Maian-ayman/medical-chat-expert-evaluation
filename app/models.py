from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class ExpertEvaluation(Base):
    __tablename__ = "expert_evaluations"
    __table_args__ = (UniqueConstraint("session_id", name="uq_expert_eval_session"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)
    department_name: Mapped[str] = mapped_column(String(128), nullable=False)

    clinical_relevance_score: Mapped[int | None] = mapped_column(Integer)
    question_specificity_score: Mapped[int | None] = mapped_column(Integer)
    single_question_score: Mapped[int | None] = mapped_column(Integer)
    safety_score: Mapped[int | None] = mapped_column(Integer)
    linguistic_score: Mapped[int | None] = mapped_column(Integer)
    denial_handling_score: Mapped[int | None] = mapped_column(Integer)
    department_accuracy_score: Mapped[int | None] = mapped_column(Integer)
    clinical_reasoning_score: Mapped[int | None] = mapped_column(Integer)

    doctor_notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
