"""Domain models for the workflow API.

These Pydantic models are the authoritative wire contract. Frontend TypeScript
types are generated from the OpenAPI schema this application exposes.
"""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

DataType = Literal["Dataset", "Model"]
NodeType = Literal["DataSource", "Transform", "Model"]
WorkflowStatus = Literal["valid", "invalid"]

# An error is a document the editor could not have produced; a warning is an
# unfinished pipeline. See app/validation/catalog.py.
Severity = Literal["error", "warning"]


class CamelModel(BaseModel):
    """Base model that serialises to camelCase on the wire.

    The browser client uses camelCase field names, so emitting camelCase keeps a
    single contract across the stack. `populate_by_name=True` means Python code
    can still build models with their snake_case field names.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class HandleDefinition(CamelModel):
    id: str
    label: str
    type: DataType
    required: bool = False


class Position(CamelModel):
    x: float
    y: float


class WorkflowNodeData(CamelModel):
    label: str
    inputs: list[HandleDefinition] = []
    outputs: list[HandleDefinition] = []


class WorkflowNode(CamelModel):
    id: str
    type: NodeType
    position: Position
    data: WorkflowNodeData


class WorkflowEdge(CamelModel):
    id: str
    source_node_id: str
    source_handle_id: str
    target_node_id: str
    target_handle_id: str


class WorkflowWrite(CamelModel):
    """A workflow document submitted by a client. The server assigns id and status."""

    name: str
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []

    @field_validator("name")
    @classmethod
    def require_non_blank_workflow_name(cls, workflow_name: str) -> str:
        stripped_workflow_name = workflow_name.strip()
        if not stripped_workflow_name:
            raise ValueError("Workflow name cannot be blank")
        return stripped_workflow_name


class Workflow(CamelModel):
    id: str
    name: str
    status: WorkflowStatus
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []


class WorkflowSummary(CamelModel):
    id: str
    name: str
    status: WorkflowStatus


class ValidationIssue(CamelModel):
    """A single coded, path-addressed diagnostic.

    `message` is written for the person using the editor, so it names node and
    handle labels. The matching id-based message goes to the backend log.
    """

    code: str
    severity: Severity
    message: str
    node_id: Optional[str] = None
    edge_id: Optional[str] = None
    path: Optional[str] = None


class ValidationResult(CamelModel):
    valid: bool
    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []


class WorkflowDocument(CamelModel):
    """A stored workflow together with the validation of that document."""

    workflow: Workflow
    validation: ValidationResult
