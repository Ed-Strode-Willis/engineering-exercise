from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_workflow_repository
from app.models import Workflow, WorkflowDocument, WorkflowSummary, WorkflowWrite
from app.persistence.repository import WorkflowRepository
from app.validation.service import status_for_validation, validate_workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])

WORKFLOW_NOT_FOUND_DETAIL = "Workflow not found"


@router.get("")
def list_workflows(
    repository: WorkflowRepository = Depends(get_workflow_repository),
) -> list[WorkflowSummary]:
    """List stored workflows, oldest first."""
    return repository.list_workflow_summaries()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_workflow(
    workflow_write: WorkflowWrite,
    repository: WorkflowRepository = Depends(get_workflow_repository),
) -> WorkflowDocument:
    """Store a workflow and return it with its validation."""
    validation = validate_workflow(workflow_write)
    workflow = repository.create_workflow(
        workflow_write, status_for_validation(validation)
    )
    return WorkflowDocument(workflow=workflow, validation=validation)


@router.get("/{workflow_id}")
def get_workflow(
    workflow_id: str,
    repository: WorkflowRepository = Depends(get_workflow_repository),
) -> WorkflowDocument:
    """Retrieve a workflow and the validation of the stored document."""
    workflow = repository.get_workflow(workflow_id)
    if workflow is None:
        raise_workflow_not_found()
    return build_workflow_document(workflow)


@router.put("/{workflow_id}")
def replace_workflow(
    workflow_id: str,
    workflow_write: WorkflowWrite,
    repository: WorkflowRepository = Depends(get_workflow_repository),
) -> WorkflowDocument:
    """Replace a workflow. An invalid graph is stored with status invalid."""
    validation = validate_workflow(workflow_write)
    workflow = repository.replace_workflow(
        workflow_id, workflow_write, status_for_validation(validation)
    )
    if workflow is None:
        raise_workflow_not_found()
    return WorkflowDocument(workflow=workflow, validation=validation)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    workflow_id: str,
    repository: WorkflowRepository = Depends(get_workflow_repository),
) -> None:
    """Delete a workflow."""
    deleted = repository.delete_workflow(workflow_id)
    if not deleted:
        raise_workflow_not_found()


def build_workflow_document(workflow: Workflow) -> WorkflowDocument:
    """A stored workflow with the validation of the document as stored."""
    return WorkflowDocument(
        workflow=workflow, validation=validate_workflow(workflow_to_write(workflow))
    )


def workflow_to_write(workflow: Workflow) -> WorkflowWrite:
    return WorkflowWrite(
        name=workflow.name,
        nodes=workflow.nodes,
        edges=workflow.edges,
    )


def raise_workflow_not_found() -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=WORKFLOW_NOT_FOUND_DETAIL,
    )
