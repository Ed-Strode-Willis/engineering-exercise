from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.models import ValidationIssue, ValidationResult, Workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])

NOT_IMPLEMENTED_VALIDATION_RESPONSE = {
    status.HTTP_501_NOT_IMPLEMENTED: {"model": ValidationResult},
}

# TODO (candidate): persistence. In-memory, a file, SQLite — your choice
# (brief §C3). Whatever you pick, state the consequences.


def build_not_implemented_validation_result(message: str) -> ValidationResult:
    not_implemented_issue = ValidationIssue(
        code="not_implemented",
        message=message,
    )
    return ValidationResult(valid=False, errors=[not_implemented_issue])


def not_implemented_validation_response(message: str) -> JSONResponse:
    validation_result = build_not_implemented_validation_result(message)
    response_body = validation_result.model_dump(by_alias=True, mode="json")
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content=response_body,
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    responses=NOT_IMPLEMENTED_VALIDATION_RESPONSE,
)
def create_workflow(workflow: Workflow) -> Workflow:
    """Create/save a workflow and return it with a stable identifier."""
    return not_implemented_validation_response(
        "Not implemented — design and build POST /workflows."
    )


@router.get(
    "/{workflow_id}",
    responses=NOT_IMPLEMENTED_VALIDATION_RESPONSE,
)
def get_workflow(workflow_id: str) -> Workflow:
    """Retrieve a workflow by its identifier."""
    return not_implemented_validation_response(
        "Not implemented — design and build GET /workflows/{id}."
    )


@router.put(
    "/{workflow_id}",
    responses=NOT_IMPLEMENTED_VALIDATION_RESPONSE,
)
def update_workflow(workflow_id: str, workflow: Workflow) -> Workflow:
    """Update an existing workflow."""
    return not_implemented_validation_response(
        "Not implemented — design and build PUT /workflows/{id}."
    )


# TODO (candidate): full-workflow validation (brief §C4). Decide whether this is
# a separate endpoint (e.g. POST /workflows/{id}/validate or POST
# /workflows/validate) or runs on save, and return structured diagnostics (see
# `ValidationResult` in app/models.py) rather than a bare boolean. Keeping the
# validation logic in its own pure module, independent of the web layer, makes
# it far easier to test.
