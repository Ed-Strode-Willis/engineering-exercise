"""Choose a repository implementation from settings."""

from app.config import SETTINGS
from app.persistence.memory import InMemoryWorkflowRepository
from app.persistence.repository import WorkflowRepository


def build_workflow_repository() -> WorkflowRepository:
    """Build the process-wide store.

    `persistence` is currently always `memory`. The repository protocol is the
    seam a SQLite implementation would fill: one JSON document per workflow row.
    """

    persistence_choice = SETTINGS.persistence
    if persistence_choice == "memory":
        return InMemoryWorkflowRepository(seed_example_workflow=True)
    raise RuntimeError(
        f"Persistence '{persistence_choice}' is not implemented. Use 'memory'."
    )
