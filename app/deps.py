from fastapi import Header, HTTPException


def get_evaluator_id(x_evaluator_id: str | None = Header(default=None, alias="X-Evaluator-Id")) -> str:
    if not x_evaluator_id or not x_evaluator_id.strip():
        raise HTTPException(status_code=400, detail="Missing evaluator id")
    evaluator_id = x_evaluator_id.strip()
    if len(evaluator_id) > 64:
        raise HTTPException(status_code=400, detail="Invalid evaluator id")
    return evaluator_id
