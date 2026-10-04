"""Validate a whole workflow document.

Every check always runs. The message returned to the client uses the labels on
the canvas. The message written to the log uses ids.

Errors:

- Two nodes share an id.
- Two edges share an id.
- One node uses the same handle id twice on the same side.
- An edge names a node that is not in the workflow.
- An edge names a handle that node does not have.
- A node's handles are not the ones its type declares.
- An edge does not run from an output to an input.
- The two handle types are different.
- An input already has a connection.
- An edge closes a loop, including a node connected to itself.

Warnings:

- A required input has no connection.
- A required output has no connection. A Transform output is required.

A warning still makes the workflow invalid.

The frontend refuses a loop, mismatched handle types, and a second connection
into an input while an edge is dragged. Those checks have to stay in step with
this list.
"""

import logging
from typing import Optional

from app.models import (
    HandleDefinition,
    Severity,
    ValidationIssue,
    ValidationResult,
    WorkflowEdge,
    WorkflowNode,
    WorkflowStatus,
    WorkflowWrite,
)
from app.validation.catalog import (
    NODE_CATALOG,
    handle_types_are_compatible,
    issue_severity,
    render_log_message,
    render_user_message,
)

VALIDATION_LOGGER = logging.getLogger(__name__)

MISSING_NODE_LABEL = "a missing node"
UNTITLED_NODE_LABEL = "an untitled node"


def validate_workflow(workflow_write: WorkflowWrite) -> ValidationResult:
    validation_issues = collect_validation_issues(workflow_write)
    return ValidationResult(
        valid=not validation_issues,
        errors=issues_with_severity(validation_issues, "error"),
        warnings=issues_with_severity(validation_issues, "warning"),
    )


def status_for_validation(validation_result: ValidationResult) -> WorkflowStatus:
    if validation_result.valid:
        return "valid"
    return "invalid"


def collect_validation_issues(
    workflow_write: WorkflowWrite,
) -> list[ValidationIssue]:
    nodes = workflow_write.nodes
    edges = workflow_write.edges
    nodes_by_id = index_first_node_by_id(nodes)
    return [
        *find_duplicate_node_ids(nodes),
        *find_duplicate_edge_ids(nodes_by_id, edges),
        *find_duplicate_handle_ids(nodes),
        *find_catalog_mismatches(nodes),
        *find_edge_problems(nodes_by_id, edges),
        *find_open_required_inputs(nodes, edges),
        *find_open_required_outputs(nodes, edges),
        *find_cycles(nodes_by_id, nodes, edges),
    ]


def issues_with_severity(
    validation_issues: list[ValidationIssue], severity: Severity
) -> list[ValidationIssue]:
    return [issue for issue in validation_issues if issue.severity == severity]


def build_validation_issue(
    issue_code: str,
    message_values: dict[str, str],
    node_id: Optional[str] = None,
    edge_id: Optional[str] = None,
    path: Optional[str] = None,
) -> ValidationIssue:
    """Build the issue the client reads, and log the id-based version of it.

    `message_values` holds every id and label either message may name. A message
    asking for a value that is not there raises, so a missing value fails a test
    rather than reaching a user as a gap in a sentence.
    """
    severity = issue_severity(issue_code)
    log_validation_issue(
        severity, issue_code, render_log_message(issue_code, message_values), path
    )
    return ValidationIssue(
        code=issue_code,
        severity=severity,
        message=render_user_message(issue_code, message_values),
        node_id=node_id,
        edge_id=edge_id,
        path=path,
    )


def log_validation_issue(
    severity: Severity, issue_code: str, log_message: str, path: Optional[str]
) -> None:
    log_line = f"{issue_code}: {log_message}"
    if path is not None:
        log_line = f"{log_line} path={path}"
    if severity == "error":
        VALIDATION_LOGGER.error(log_line)
        return
    VALIDATION_LOGGER.warning(log_line)


def find_duplicate_node_ids(nodes: list[WorkflowNode]) -> list[ValidationIssue]:
    """One id may name only one node."""
    seen_node_ids: set[str] = set()
    duplicate_node_issues: list[ValidationIssue] = []
    for node_index, node in enumerate(nodes):
        if node.id in seen_node_ids:
            duplicate_node_issues.append(
                build_validation_issue(
                    "DUPLICATE_NODE_ID",
                    {"node_id": node.id, "node_label": label_for_node(node)},
                    node_id=node.id,
                    path=f"nodes[{node_index}].id",
                )
            )
        seen_node_ids.add(node.id)
    return duplicate_node_issues


def find_duplicate_edge_ids(
    nodes_by_id: dict[str, WorkflowNode], edges: list[WorkflowEdge]
) -> list[ValidationIssue]:
    """One id may name only one edge."""
    seen_edge_ids: set[str] = set()
    duplicate_edge_issues: list[ValidationIssue] = []
    for edge_index, edge in enumerate(edges):
        if edge.id in seen_edge_ids:
            duplicate_edge_issues.append(
                build_validation_issue(
                    "DUPLICATE_EDGE_ID",
                    edge_message_values(nodes_by_id, edge),
                    edge_id=edge.id,
                    path=f"edges[{edge_index}].id",
                )
            )
        seen_edge_ids.add(edge.id)
    return duplicate_edge_issues


def find_duplicate_handle_ids(nodes: list[WorkflowNode]) -> list[ValidationIssue]:
    """No node may offer the same handle twice on one side."""
    duplicate_handle_issues: list[ValidationIssue] = []
    for node_index, node in enumerate(nodes):
        duplicate_handle_issues.extend(find_duplicate_handles_on_node(node, node_index))
    return duplicate_handle_issues


def find_duplicate_handles_on_node(
    node: WorkflowNode, node_index: int
) -> list[ValidationIssue]:
    """The same id may appear once on the input side and once on the output side."""
    return [
        *find_duplicate_handles_in_list(node, node_index, node.data.inputs, "inputs"),
        *find_duplicate_handles_in_list(node, node_index, node.data.outputs, "outputs"),
    ]


def find_duplicate_handles_in_list(
    node: WorkflowNode,
    node_index: int,
    handles: list[HandleDefinition],
    handle_side: str,
) -> list[ValidationIssue]:
    seen_handle_ids: set[str] = set()
    duplicate_handle_issues: list[ValidationIssue] = []
    for handle_index, handle in enumerate(handles):
        if handle.id in seen_handle_ids:
            duplicate_handle_issues.append(
                build_validation_issue(
                    "DUPLICATE_HANDLE_ID",
                    {
                        "handle_id": handle.id,
                        "node_id": node.id,
                        "handle_label": label_for_handle(handle),
                        "node_label": label_for_node(node),
                    },
                    node_id=node.id,
                    path=f"nodes[{node_index}].data.{handle_side}[{handle_index}].id",
                )
            )
        seen_handle_ids.add(handle.id)
    return duplicate_handle_issues


def find_catalog_mismatches(nodes: list[WorkflowNode]) -> list[ValidationIssue]:
    """Each node carries exactly the handles its type declares."""
    catalog_mismatch_issues: list[ValidationIssue] = []
    for node_index, node in enumerate(nodes):
        if node_handles_match_catalog(node):
            continue
        catalog_mismatch_issues.append(
            build_validation_issue(
                "HANDLES_DO_NOT_MATCH_CATALOG",
                {
                    "node_id": node.id,
                    "node_type": node.type,
                    "node_label": label_for_node(node),
                },
                node_id=node.id,
                path=f"nodes[{node_index}].data",
            )
        )
    return catalog_mismatch_issues


def node_handles_match_catalog(node: WorkflowNode) -> bool:
    catalog_entry = NODE_CATALOG[node.type]
    return handle_lists_match(
        node.data.inputs, catalog_entry.inputs
    ) and handle_lists_match(node.data.outputs, catalog_entry.outputs)


def handle_lists_match(
    declared_handles: list[HandleDefinition],
    catalog_handles: list[HandleDefinition],
) -> bool:
    if len(declared_handles) != len(catalog_handles):
        return False
    return all(
        handles_match(declared_handle, catalog_handle)
        for declared_handle, catalog_handle in zip(declared_handles, catalog_handles)
    )


def handles_match(
    declared_handle: HandleDefinition, catalog_handle: HandleDefinition
) -> bool:
    """A label is a name the user chose, so it is not part of handle identity."""
    return (
        declared_handle.id == catalog_handle.id
        and declared_handle.type == catalog_handle.type
        and declared_handle.required == catalog_handle.required
    )


def find_edge_problems(
    nodes_by_id: dict[str, WorkflowNode], edges: list[WorkflowEdge]
) -> list[ValidationIssue]:
    """Every edge names real nodes and handles, and runs from an output to an input."""
    edge_issues: list[ValidationIssue] = []
    occupied_inputs: set[tuple[str, str]] = set()
    for edge_index, edge in enumerate(edges):
        edge_issues.extend(
            find_problems_for_edge(edge, edge_index, nodes_by_id, occupied_inputs)
        )
    return edge_issues


def find_problems_for_edge(
    edge: WorkflowEdge,
    edge_index: int,
    nodes_by_id: dict[str, WorkflowNode],
    occupied_inputs: set[tuple[str, str]],
) -> list[ValidationIssue]:
    edge_issues: list[ValidationIssue] = []
    source_node = nodes_by_id.get(edge.source_node_id)
    target_node = nodes_by_id.get(edge.target_node_id)
    if source_node is None:
        edge_issues.append(unknown_node_issue(edge, edge_index, edge.source_node_id))
    if target_node is None:
        edge_issues.append(unknown_node_issue(edge, edge_index, edge.target_node_id))
    source_output = find_output_handle(source_node, edge.source_handle_id)
    target_input = find_input_handle(target_node, edge.target_handle_id)
    edge_issues.extend(
        find_handle_reference_problems(
            edge,
            edge_index,
            nodes_by_id,
            source_node,
            target_node,
            source_output,
            target_input,
        )
    )
    if source_output is not None and target_input is not None:
        edge_issues.extend(
            find_type_problem(
                edge, edge_index, nodes_by_id, source_output, target_input
            )
        )
    edge_issues.extend(
        find_occupied_input_problem(
            edge, edge_index, nodes_by_id, target_input, occupied_inputs
        )
    )
    return edge_issues


def find_handle_reference_problems(
    edge: WorkflowEdge,
    edge_index: int,
    nodes_by_id: dict[str, WorkflowNode],
    source_node: Optional[WorkflowNode],
    target_node: Optional[WorkflowNode],
    source_output: Optional[HandleDefinition],
    target_input: Optional[HandleDefinition],
) -> list[ValidationIssue]:
    """A handle the edge names is either missing, or on the wrong side."""
    handle_reference_issues: list[ValidationIssue] = []
    if source_node is not None and source_output is None:
        if find_input_handle(source_node, edge.source_handle_id) is not None:
            handle_reference_issues.append(invalid_direction_issue(edge, edge_index))
        else:
            handle_reference_issues.append(
                unknown_handle_issue(
                    edge,
                    edge_index,
                    nodes_by_id,
                    edge.source_node_id,
                    edge.source_handle_id,
                )
            )
    if target_node is not None and target_input is None:
        if find_output_handle(target_node, edge.target_handle_id) is not None:
            handle_reference_issues.append(invalid_direction_issue(edge, edge_index))
        else:
            handle_reference_issues.append(
                unknown_handle_issue(
                    edge,
                    edge_index,
                    nodes_by_id,
                    edge.target_node_id,
                    edge.target_handle_id,
                )
            )
    return handle_reference_issues


def find_type_problem(
    edge: WorkflowEdge,
    edge_index: int,
    nodes_by_id: dict[str, WorkflowNode],
    source_output: HandleDefinition,
    target_input: HandleDefinition,
) -> list[ValidationIssue]:
    """A Dataset output feeds a Dataset input; a Model output does not."""
    if handle_types_are_compatible(source_output.type, target_input.type):
        return []
    return [
        build_validation_issue(
            "INCOMPATIBLE_HANDLE_TYPES",
            {
                **edge_message_values(nodes_by_id, edge),
                "source_type": source_output.type,
                "target_type": target_input.type,
                "source_label": label_for_handle(source_output),
                "target_label": label_for_handle(target_input),
            },
            edge_id=edge.id,
            path=f"edges[{edge_index}]",
        )
    ]


def find_occupied_input_problem(
    edge: WorkflowEdge,
    edge_index: int,
    nodes_by_id: dict[str, WorkflowNode],
    target_input: Optional[HandleDefinition],
    occupied_inputs: set[tuple[str, str]],
) -> list[ValidationIssue]:
    """An input handle takes one edge, so the second edge into it is the problem."""
    if target_input is None:
        return []
    input_key = (edge.target_node_id, edge.target_handle_id)
    if input_key in occupied_inputs:
        return [
            build_validation_issue(
                "INPUT_ALREADY_CONNECTED",
                {
                    "handle_id": edge.target_handle_id,
                    "node_id": edge.target_node_id,
                    "handle_label": label_for_handle(target_input),
                    "node_label": label_for_node_id(nodes_by_id, edge.target_node_id),
                },
                node_id=edge.target_node_id,
                edge_id=edge.id,
                path=f"edges[{edge_index}]",
            )
        ]
    occupied_inputs.add(input_key)
    return []


def find_open_required_inputs(
    nodes: list[WorkflowNode], edges: list[WorkflowEdge]
) -> list[ValidationIssue]:
    """A required input handle with no incoming edge."""
    connected_inputs = {(edge.target_node_id, edge.target_handle_id) for edge in edges}
    open_input_issues: list[ValidationIssue] = []
    for node_index, node in enumerate(nodes):
        catalog_entry = NODE_CATALOG[node.type]
        for catalog_input in catalog_entry.inputs:
            if not catalog_input.required:
                continue
            if (node.id, catalog_input.id) in connected_inputs:
                continue
            open_input_issues.append(
                build_validation_issue(
                    "REQUIRED_INPUT_DISCONNECTED",
                    {
                        "handle_id": catalog_input.id,
                        "node_id": node.id,
                        "handle_label": label_for_declared_input(node, catalog_input),
                        "node_label": label_for_node(node),
                    },
                    node_id=node.id,
                    path=f"nodes[{node_index}]",
                )
            )
    return open_input_issues


def find_open_required_outputs(
    nodes: list[WorkflowNode], edges: list[WorkflowEdge]
) -> list[ValidationIssue]:
    """A required output handle with no outgoing edge."""
    connected_outputs = {(edge.source_node_id, edge.source_handle_id) for edge in edges}
    open_output_issues: list[ValidationIssue] = []
    for node_index, node in enumerate(nodes):
        catalog_entry = NODE_CATALOG[node.type]
        for catalog_output in catalog_entry.outputs:
            if not catalog_output.required:
                continue
            if (node.id, catalog_output.id) in connected_outputs:
                continue
            open_output_issues.append(
                build_validation_issue(
                    "REQUIRED_OUTPUT_DISCONNECTED",
                    {
                        "handle_id": catalog_output.id,
                        "node_id": node.id,
                        "handle_label": label_for_declared_output(node, catalog_output),
                        "node_label": label_for_node(node),
                    },
                    node_id=node.id,
                    path=f"nodes[{node_index}]",
                )
            )
    return open_output_issues


def find_cycles(
    nodes_by_id: dict[str, WorkflowNode],
    nodes: list[WorkflowNode],
    edges: list[WorkflowEdge],
) -> list[ValidationIssue]:
    """Follow the edges and report each edge that returns to a node already visited."""
    known_node_ids = {node.id for node in nodes}
    adjacency = build_adjacency(edges, known_node_ids)
    visit_state = {node_id: "unseen" for node_id in known_node_ids}
    cycle_issues: list[ValidationIssue] = []
    for node in nodes:
        if visit_state[node.id] == "unseen":
            walk_for_cycles(node.id, nodes_by_id, adjacency, visit_state, cycle_issues)
    return cycle_issues


def build_adjacency(
    edges: list[WorkflowEdge], known_node_ids: set[str]
) -> dict[str, list[tuple[str, WorkflowEdge, int]]]:
    adjacency: dict[str, list[tuple[str, WorkflowEdge, int]]] = {
        node_id: [] for node_id in known_node_ids
    }
    for edge_index, edge in enumerate(edges):
        source_is_known = edge.source_node_id in known_node_ids
        target_is_known = edge.target_node_id in known_node_ids
        if source_is_known and target_is_known:
            adjacency[edge.source_node_id].append(
                (edge.target_node_id, edge, edge_index)
            )
    return adjacency


def walk_for_cycles(
    node_id: str,
    nodes_by_id: dict[str, WorkflowNode],
    adjacency: dict[str, list[tuple[str, WorkflowEdge, int]]],
    visit_state: dict[str, str],
    cycle_issues: list[ValidationIssue],
) -> None:
    """An edge reaching a node already on the current path closes a cycle."""
    visit_state[node_id] = "visiting"
    for target_node_id, edge, edge_index in adjacency[node_id]:
        if visit_state[target_node_id] == "visiting":
            cycle_issues.append(cycle_issue(nodes_by_id, edge, edge_index))
            continue
        if visit_state[target_node_id] == "unseen":
            walk_for_cycles(
                target_node_id, nodes_by_id, adjacency, visit_state, cycle_issues
            )
    visit_state[node_id] = "done"


def unknown_node_issue(
    edge: WorkflowEdge, edge_index: int, missing_node_id: str
) -> ValidationIssue:
    return build_validation_issue(
        "UNKNOWN_NODE",
        {"edge_id": edge.id, "node_id": missing_node_id},
        node_id=missing_node_id,
        edge_id=edge.id,
        path=f"edges[{edge_index}]",
    )


def unknown_handle_issue(
    edge: WorkflowEdge,
    edge_index: int,
    nodes_by_id: dict[str, WorkflowNode],
    node_id: str,
    handle_id: str,
) -> ValidationIssue:
    return build_validation_issue(
        "UNKNOWN_HANDLE",
        {
            "edge_id": edge.id,
            "handle_id": handle_id,
            "node_id": node_id,
            "node_label": label_for_node_id(nodes_by_id, node_id),
        },
        node_id=node_id,
        edge_id=edge.id,
        path=f"edges[{edge_index}]",
    )


def invalid_direction_issue(edge: WorkflowEdge, edge_index: int) -> ValidationIssue:
    return build_validation_issue(
        "INVALID_HANDLE_DIRECTION",
        {"edge_id": edge.id},
        edge_id=edge.id,
        path=f"edges[{edge_index}]",
    )


def cycle_issue(
    nodes_by_id: dict[str, WorkflowNode], edge: WorkflowEdge, edge_index: int
) -> ValidationIssue:
    return build_validation_issue(
        "CYCLE_DETECTED",
        edge_message_values(nodes_by_id, edge),
        edge_id=edge.id,
        path=f"edges[{edge_index}]",
    )


def edge_message_values(
    nodes_by_id: dict[str, WorkflowNode], edge: WorkflowEdge
) -> dict[str, str]:
    """The values an edge message needs: the edge id and both node labels."""
    return {
        "edge_id": edge.id,
        "source_node_label": label_for_node_id(nodes_by_id, edge.source_node_id),
        "target_node_label": label_for_node_id(nodes_by_id, edge.target_node_id),
    }


def index_first_node_by_id(nodes: list[WorkflowNode]) -> dict[str, WorkflowNode]:
    """Duplicate ids are reported separately; here the first one wins."""
    nodes_by_id: dict[str, WorkflowNode] = {}
    for node in nodes:
        if node.id not in nodes_by_id:
            nodes_by_id[node.id] = node
    return nodes_by_id


def label_for_node(node: WorkflowNode) -> str:
    return node.data.label.strip() or UNTITLED_NODE_LABEL


def label_for_node_id(nodes_by_id: dict[str, WorkflowNode], node_id: str) -> str:
    node = nodes_by_id.get(node_id)
    if node is None:
        return MISSING_NODE_LABEL
    return label_for_node(node)


def label_for_handle(handle: HandleDefinition) -> str:
    """A custom handle label is quoted. A data type is left bare."""
    handle_label = handle.label.strip()
    if not handle_label or handle_label == handle.type:
        return handle.type
    return f'"{handle_label}"'


def label_for_declared_input(
    node: WorkflowNode, catalog_input: HandleDefinition
) -> str:
    """Prefer the label the node carries, which is the one drawn on the canvas."""
    return label_for_declared_handle(node.data.inputs, catalog_input)


def label_for_declared_output(
    node: WorkflowNode, catalog_output: HandleDefinition
) -> str:
    """Prefer the label the node carries, which is the one drawn on the canvas."""
    return label_for_declared_handle(node.data.outputs, catalog_output)


def label_for_declared_handle(
    declared_handles: list[HandleDefinition], catalog_handle: HandleDefinition
) -> str:
    declared_handle = find_handle(declared_handles, catalog_handle.id)
    if declared_handle is None:
        return label_for_handle(catalog_handle)
    return label_for_handle(declared_handle)


def find_output_handle(
    node: Optional[WorkflowNode], handle_id: str
) -> Optional[HandleDefinition]:
    if node is None:
        return None
    return find_handle(node.data.outputs, handle_id)


def find_input_handle(
    node: Optional[WorkflowNode], handle_id: str
) -> Optional[HandleDefinition]:
    if node is None:
        return None
    return find_handle(node.data.inputs, handle_id)


def find_handle(
    handles: list[HandleDefinition], handle_id: str
) -> Optional[HandleDefinition]:
    for handle in handles:
        if handle.id == handle_id:
            return handle
    return None
