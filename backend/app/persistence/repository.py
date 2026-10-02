"""Persistence boundary for workflows.

An in-memory implementation ships with the application. A SQLite implementation
would store one JSON document per row, with columns for `id`, creation order,
and the document itself, and would satisfy the same methods without changing
the routes.
"""

from typing import Optional, Protocol

from app.models import Workflow, WorkflowStatus, WorkflowSummary, WorkflowWrite


class WorkflowRepository(Protocol):
    def list_workflow_summaries(self) -> list[WorkflowSummary]:
        """Return every workflow, oldest first."""

    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """Return the stored workflow, or None when the id is unknown."""

    def create_workflow(
        self, workflow_write: WorkflowWrite, workflow_status: WorkflowStatus
    ) -> Workflow:
        """Store a new workflow and assign its id."""

    def replace_workflow(
        self,
        workflow_id: str,
        workflow_write: WorkflowWrite,
        workflow_status: WorkflowStatus,
    ) -> Optional[Workflow]:
        """Replace the whole document."""

    def delete_workflow(self, workflow_id: str) -> bool:
        """Remove the workflow. False when the id is unknown."""
