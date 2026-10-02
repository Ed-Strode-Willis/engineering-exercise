"""FastAPI dependencies."""

from app.persistence.factory import build_workflow_repository
from app.persistence.repository import WorkflowRepository

workflow_repository = build_workflow_repository()


def get_workflow_repository() -> WorkflowRepository:
    return workflow_repository
