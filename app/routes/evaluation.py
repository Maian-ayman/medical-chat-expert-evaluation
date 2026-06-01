from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import DEPARTMENTS, DEPARTMENT_BY_KEY, department_for_session
from app.database import get_db
from app.models import ChatMessage, ExpertEvaluation
from app.schemas import (
    CaseOut,
    DepartmentOut,
    EvaluationIn,
    EvaluationListItemOut,
    EvaluationTableRowOut,
    EvaluationOut,
    MessageOut,
    SessionMessagesOut,
)

router = APIRouter(prefix="/api", tags=["evaluation"])

VISIBLE_ROLES = ("user", "assistant")


def _session_ids_for_department(dept: dict) -> list[int]:
    return list(range(dept["session_start"], dept["session_end"] + 1))


def _evaluated_session_ids(db: Session, session_ids: list[int]) -> set[int]:
    if not session_ids:
        return set()
    rows = db.execute(
        select(ExpertEvaluation.session_id).where(
            ExpertEvaluation.session_id.in_(session_ids)
        )
    ).scalars()
    return set(rows.all())


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    result = []
    for dept in DEPARTMENTS:
        session_ids = _session_ids_for_department(dept)
        evaluated = _evaluated_session_ids(db, session_ids)
        result.append(
            DepartmentOut(
                key=dept["key"],
                name_ar=dept["name_ar"],
                name_en=dept["name_en"],
                session_start=dept["session_start"],
                session_end=dept["session_end"],
                total_cases=len(session_ids),
                evaluated_count=len(evaluated),
            )
        )
    return result


@router.get("/departments/{dept_key}/cases", response_model=list[CaseOut])
def list_cases(dept_key: str, db: Session = Depends(get_db)):
    dept = DEPARTMENT_BY_KEY.get(dept_key)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    session_ids = _session_ids_for_department(dept)
    evaluated = _evaluated_session_ids(db, session_ids)

    return [
        CaseOut(
            case_number=index + 1,
            session_id=sid,
            evaluated=sid in evaluated,
        )
        for index, sid in enumerate(session_ids)
    ]


@router.get("/sessions/{session_id}/messages", response_model=SessionMessagesOut)
def get_session_messages(session_id: int, db: Session = Depends(get_db)):
    dept = department_for_session(session_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Session not in evaluation scope")

    messages = (
        db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.session_id == session_id,
                ChatMessage.role.in_(VISIBLE_ROLES),
            )
            .order_by(ChatMessage.created_at.asc())
        )
        .scalars()
        .all()
    )

    if not messages:
        raise HTTPException(status_code=404, detail="No messages for this session")

    session_ids = _session_ids_for_department(dept)
    try:
        idx = session_ids.index(session_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not in department")

    return SessionMessagesOut(
        session_id=session_id,
        department_key=dept["key"],
        department_name_ar=dept["name_ar"],
        case_number=idx + 1,
        messages=[
            MessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages
        ],
        prev_session_id=session_ids[idx - 1] if idx > 0 else None,
        next_session_id=session_ids[idx + 1] if idx < len(session_ids) - 1 else None,
    )


@router.get("/sessions/{session_id}/evaluation", response_model=EvaluationOut | None)
def get_evaluation(session_id: int, db: Session = Depends(get_db)):
    if not department_for_session(session_id):
        raise HTTPException(status_code=404, detail="Session not in evaluation scope")

    evaluation = db.execute(
        select(ExpertEvaluation).where(ExpertEvaluation.session_id == session_id)
    ).scalar_one_or_none()

    if not evaluation:
        return None

    return EvaluationOut(
        session_id=evaluation.session_id,
        department_name=evaluation.department_name,
        clinical_relevance_score=evaluation.clinical_relevance_score,
        question_specificity_score=evaluation.question_specificity_score,
        single_question_score=evaluation.single_question_score,
        safety_score=evaluation.safety_score,
        linguistic_score=evaluation.linguistic_score,
        denial_handling_score=evaluation.denial_handling_score,
        department_accuracy_score=evaluation.department_accuracy_score,
        clinical_reasoning_score=evaluation.clinical_reasoning_score,
        doctor_notes=evaluation.doctor_notes,
        updated_at=evaluation.updated_at,
    )


@router.get("/evaluations/saved", response_model=list[EvaluationListItemOut])
def list_saved_evaluations(db: Session = Depends(get_db)):
    evaluations = (
        db.execute(
            select(ExpertEvaluation).order_by(ExpertEvaluation.updated_at.desc())
        )
        .scalars()
        .all()
    )
    result: list[EvaluationListItemOut] = []
    for evaluation in evaluations:
        dept = department_for_session(evaluation.session_id)
        if not dept:
            continue
        session_ids = _session_ids_for_department(dept)
        try:
            case_number = session_ids.index(evaluation.session_id) + 1
        except ValueError:
            continue
        result.append(
            EvaluationListItemOut(
                session_id=evaluation.session_id,
                case_number=case_number,
                department_key=dept["key"],
                department_name=evaluation.department_name,
                clinical_relevance_score=evaluation.clinical_relevance_score,
                question_specificity_score=evaluation.question_specificity_score,
                single_question_score=evaluation.single_question_score,
                safety_score=evaluation.safety_score,
                linguistic_score=evaluation.linguistic_score,
                denial_handling_score=evaluation.denial_handling_score,
                department_accuracy_score=evaluation.department_accuracy_score,
                clinical_reasoning_score=evaluation.clinical_reasoning_score,
                doctor_notes=evaluation.doctor_notes,
                updated_at=evaluation.updated_at,
            )
        )
    return result


@router.get("/evaluations", response_model=list[EvaluationTableRowOut])
def list_evaluations(db: Session = Depends(get_db)):
    all_rows: list[EvaluationTableRowOut] = []

    all_session_ids: list[int] = []
    for dept in DEPARTMENTS:
        all_session_ids.extend(_session_ids_for_department(dept))

    evaluations = (
        db.execute(
            select(ExpertEvaluation).where(ExpertEvaluation.session_id.in_(all_session_ids))
        )
        .scalars()
        .all()
    )
    by_session: dict[int, ExpertEvaluation] = {e.session_id: e for e in evaluations}

    for dept in DEPARTMENTS:
        session_ids = _session_ids_for_department(dept)
        for idx, sid in enumerate(session_ids):
            evaluation = by_session.get(sid)
            all_rows.append(
                EvaluationTableRowOut(
                    case_number=idx + 1,
                    session_id=sid,
                    department_key=dept["key"],
                    department_name=dept["name_ar"],
                    evaluated=evaluation is not None,
                    clinical_relevance_score=getattr(evaluation, "clinical_relevance_score", None),
                    question_specificity_score=getattr(
                        evaluation, "question_specificity_score", None
                    ),
                    single_question_score=getattr(evaluation, "single_question_score", None),
                    safety_score=getattr(evaluation, "safety_score", None),
                    linguistic_score=getattr(evaluation, "linguistic_score", None),
                    denial_handling_score=getattr(evaluation, "denial_handling_score", None),
                    department_accuracy_score=getattr(
                        evaluation, "department_accuracy_score", None
                    ),
                    clinical_reasoning_score=getattr(
                        evaluation, "clinical_reasoning_score", None
                    ),
                    doctor_notes=getattr(evaluation, "doctor_notes", None),
                    updated_at=getattr(evaluation, "updated_at", None),
                )
            )

    return all_rows


@router.delete("/sessions/{session_id}/evaluation")
def delete_evaluation(session_id: int, db: Session = Depends(get_db)):
    if not department_for_session(session_id):
        raise HTTPException(status_code=404, detail="Session not in evaluation scope")

    evaluation = db.execute(
        select(ExpertEvaluation).where(ExpertEvaluation.session_id == session_id)
    ).scalar_one_or_none()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    db.delete(evaluation)
    db.commit()
    return {"deleted": True, "session_id": session_id}


@router.delete("/evaluations")
def clear_all_evaluations(db: Session = Depends(get_db)):
    result = db.execute(delete(ExpertEvaluation))
    db.commit()
    return {"deleted_count": result.rowcount}


@router.post("/sessions/{session_id}/evaluation", response_model=EvaluationOut)
def save_evaluation(
    session_id: int,
    payload: EvaluationIn,
    db: Session = Depends(get_db),
):
    dept = department_for_session(session_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Session not in evaluation scope")

    evaluation = db.execute(
        select(ExpertEvaluation).where(ExpertEvaluation.session_id == session_id)
    ).scalar_one_or_none()

    now = datetime.utcnow()
    data = payload.model_dump()

    if evaluation:
        for field, value in data.items():
            setattr(evaluation, field, value)
        evaluation.updated_at = now
    else:
        evaluation = ExpertEvaluation(
            session_id=session_id,
            department_name=dept["name_ar"],
            **data,
            created_at=now,
            updated_at=now,
        )
        db.add(evaluation)

    db.commit()
    db.refresh(evaluation)

    return EvaluationOut(
        session_id=evaluation.session_id,
        department_name=evaluation.department_name,
        clinical_relevance_score=evaluation.clinical_relevance_score,
        question_specificity_score=evaluation.question_specificity_score,
        single_question_score=evaluation.single_question_score,
        safety_score=evaluation.safety_score,
        linguistic_score=evaluation.linguistic_score,
        denial_handling_score=evaluation.denial_handling_score,
        department_accuracy_score=evaluation.department_accuracy_score,
        clinical_reasoning_score=evaluation.clinical_reasoning_score,
        doctor_notes=evaluation.doctor_notes,
        updated_at=evaluation.updated_at,
    )
