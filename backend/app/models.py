"""Domain models for the workflow API.

These Pydantic models are the authoritative wire contract. Frontend TypeScript
types are generated from the OpenAPI schema this application exposes.
"""

from typing import Annotated, Literal, Optional

from pydantic import AfterValidator, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

DataType = Literal["Dataset", "Model"]
NodeType = Literal["DataSource", "Transform", "Model"]
WorkflowStatus = Literal["valid", "invalid"]

# An error is a document the editor could not have produced; a warning is an
# unfinished pipeline. See app/validation/catalog.py.
Severity = Literal["error", "warning"]


def strip_surrounding_whitespace(value: str) -> str:
    """A typed name keeps no surrounding whitespace."""
    return value.strip()


# min_length and pattern are published in the OpenAPI schema, so the generated
# frontend check rejects the same values. A validator is not published, which is
# why the whitespace rule is a pattern rather than a strip-and-test.
NonBlankText = Annotated[
    str,
    Field(min_length=1, pattern=r".*\S.*"),
    AfterValidator(strip_surrounding_whitespace),
]


class CamelModel(BaseModel):
    """Base model that serialises to camelCase on the wire.

    The browser client uses camelCase field names, so emitting camelCase keeps a
    single contract across the stack. `populate_by_name=True` means Python code
    can still build models with their snake_case field names.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class HandleDefinition(CamelModel):
    id: NonBlankText
    label: NonBlankText
    type: DataType
    required: bool = False


class Position(CamelModel):
    x: float
    y: float


class WorkflowNodeData(CamelModel):
    label: NonBlankText
    inputs: list[HandleDefinition] = []
    outputs: list[HandleDefinition] = []


class WorkflowNode(CamelModel):
    id: NonBlankText
    type: NodeType
    position: Position
    data: WorkflowNodeData


class WorkflowEdge(CamelModel):
    id: NonBlankText
    source_node_id: NonBlankText
    source_handle_id: NonBlankText
    target_node_id: NonBlankText
    target_handle_id: NonBlankText


class WorkflowWrite(CamelModel):
    """A workflow document submitted by a client. The server assigns id and status."""

    name: NonBlankText
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []


class Workflow(CamelModel):
    id: NonBlankText
    name: NonBlankText
    status: WorkflowStatus
    nodes: list[WorkflowNode] = []
    edges: list[WorkflowEdge] = []


class WorkflowSummary(CamelModel):
    id: NonBlankText
    name: NonBlankText
    status: WorkflowStatus


class ValidationIssue(CamelModel):
    """A single coded, path-addressed diagnostic.

    `message` is written for the person using the editor, so it names node and
    handle labels. The matching id-based message goes to the backend log.
    """

    code: NonBlankText
    severity: Severity
    message: NonBlankText
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
