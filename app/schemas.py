from datetime import datetime

from pydantic import BaseModel, Field


class DepartmentOut(BaseModel):
    key: str
    name_ar: str
    name_en: str
    session_start: int
    session_end: int
    total_cases: int
    evaluated_count: int


class CaseOut(BaseModel):
    case_number: int
    session_id: int
    evaluated: bool


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime


class SessionMessagesOut(BaseModel):
    session_id: int
    department_key: str
    department_name_ar: str
    case_number: int
    messages: list[MessageOut]
    prev_session_id: int | None
    next_session_id: int | None


class EvaluationOut(BaseModel):
    session_id: int
    department_name: str
    clinical_relevance_score: int | None = None
    question_specificity_score: int | None = None
    single_question_score: int | None = None
    safety_score: int | None = None
    linguistic_score: int | None = None
    denial_handling_score: int | None = None
    department_accuracy_score: int | None = None
    clinical_reasoning_score: int | None = None
    doctor_notes: str | None = None
    updated_at: datetime | None = None


class EvaluationListItemOut(BaseModel):
    session_id: int
    case_number: int | None = None
    department_key: str | None = None
    department_name: str
    clinical_relevance_score: int | None = None
    question_specificity_score: int | None = None
    single_question_score: int | None = None
    safety_score: int | None = None
    linguistic_score: int | None = None
    denial_handling_score: int | None = None
    department_accuracy_score: int | None = None
    clinical_reasoning_score: int | None = None
    doctor_notes: str | None = None
    updated_at: datetime


class EvaluationIn(BaseModel):
    clinical_relevance_score: int = Field(..., ge=1, le=3)
    question_specificity_score: int = Field(..., ge=1, le=3)
    single_question_score: int = Field(..., ge=1, le=3)
    safety_score: int = Field(..., ge=1, le=3)
    linguistic_score: int = Field(..., ge=1, le=3)
    denial_handling_score: int = Field(..., ge=1, le=3)
    department_accuracy_score: int = Field(..., ge=1, le=3)
    clinical_reasoning_score: int = Field(..., ge=1, le=3)
    doctor_notes: str | None = None
