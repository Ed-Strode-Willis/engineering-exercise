"""Process-local workflow store. Restarting the API drops every workflow."""

from uuid import uuid4

from app.models import Workflow, WorkflowStatus, WorkflowSummary, WorkflowWrite
from app.persistence.seed import build_example_pipeline


class InMemoryWorkflowRepository:
    def __init__(self, seed_example_workflow: bool = False) -> None:
        self._workflows_in_creation_order: dict[str, Workflow] = {}
        if seed_example_workflow:
            self._store_example_pipeline()

    def list_workflow_summaries(self) -> list[WorkflowSummary]:
        return [
            build_workflow_summary(workflow)
            for workflow in self._workflows_in_creation_order.values()
        ]

    def get_workflow(self, workflow_id: str) -> Workflow | None:
        return self._workflows_in_creation_order.get(workflow_id)

    def create_workflow(
        self, workflow_write: WorkflowWrite, workflow_status: WorkflowStatus
    ) -> Workflow:
        workflow = build_stored_workflow(
            workflow_id=str(uuid4()),
            workflow_write=workflow_write,
            workflow_status=workflow_status,
        )
        self._workflows_in_creation_order[workflow.id] = workflow
        return workflow

    def replace_workflow(
        self,
        workflow_id: str,
        workflow_write: WorkflowWrite,
        workflow_status: WorkflowStatus,
    ) -> Workflow | None:
        if workflow_id not in self._workflows_in_creation_order:
            return None
        workflow = build_stored_workflow(
            workflow_id=workflow_id,
            workflow_write=workflow_write,
            workflow_status=workflow_status,
        )
        self._workflows_in_creation_order[workflow_id] = workflow
        return workflow

    def delete_workflow(self, workflow_id: str) -> bool:
        if workflow_id not in self._workflows_in_creation_order:
            return False
        del self._workflows_in_creation_order[workflow_id]
        return True

    def _store_example_pipeline(self) -> None:
        example_pipeline = build_example_pipeline()
        self._workflows_in_creation_order[example_pipeline.id] = example_pipeline


def build_workflow_summary(workflow: Workflow) -> WorkflowSummary:
    return WorkflowSummary(
        id=workflow.id,
        name=workflow.name,
        status=workflow.status,
    )


def build_stored_workflow(
    workflow_id: str,
    workflow_write: WorkflowWrite,
    workflow_status: WorkflowStatus,
) -> Workflow:
    return Workflow(
        id=workflow_id,
        name=workflow_write.name,
        status=workflow_status,
        nodes=[node.model_copy(deep=True) for node in workflow_write.nodes],
        edges=[edge.model_copy(deep=True) for edge in workflow_write.edges],
    )
