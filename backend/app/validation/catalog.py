"""Node catalog and the issues the validator can report.

This module is the only copy of the node handles and of the issue text. The
frontend receives a generated snapshot; it does not redefine either.

Every issue is rendered twice. The log message names ids, because an id is what
you need to find the document again, and it goes to the backend log. The user
message names the labels a person sees on the canvas, and it is the message the
API returns.

The checks, and which are errors or warnings, are listed in
`app/validation/service.py`. The frontend refuses some of the same connections
while an edge is dragged, and those checks have to stay in step.
"""

from dataclasses import dataclass

from app.models import HandleDefinition, NodeType, Severity


@dataclass(frozen=True)
class NodeCatalogEntry:
    inputs: list[HandleDefinition]
    outputs: list[HandleDefinition]


@dataclass(frozen=True)
class IssueDefinition:
    severity: Severity
    log_template: str
    user_template: str


def build_handle(
    handle_id: str,
    label: str,
    data_type: str,
    required: bool = False,
) -> HandleDefinition:
    return HandleDefinition(
        id=handle_id,
        label=label,
        type=data_type,
        required=required,
    )


DATASET_OUTPUT = build_handle("dataset", "Dataset", "Dataset", required=True)
DATASET_INPUT = build_handle("dataset", "Dataset", "Dataset", required=True)
MODEL_OUTPUT = build_handle("model", "Model", "Model")

NODE_CATALOG: dict[NodeType, NodeCatalogEntry] = {
    "DataSource": NodeCatalogEntry(inputs=[], outputs=[DATASET_OUTPUT]),
    "Transform": NodeCatalogEntry(inputs=[DATASET_INPUT], outputs=[DATASET_OUTPUT]),
    "Model": NodeCatalogEntry(inputs=[DATASET_INPUT], outputs=[MODEL_OUTPUT]),
}

ISSUE_DEFINITIONS: dict[str, IssueDefinition] = {
    "DUPLICATE_NODE_ID": IssueDefinition(
        severity="error",
        log_template='Node id "{node_id}" is used more than once.',
        user_template='More than one step is stored as "{node_label}".',
    ),
    "DUPLICATE_EDGE_ID": IssueDefinition(
        severity="error",
        log_template='Edge id "{edge_id}" is used more than once.',
        user_template=(
            'The connection from "{source_node_label}" to "{target_node_label}" '
            "is stored more than once."
        ),
    ),
    "DUPLICATE_HANDLE_ID": IssueDefinition(
        severity="error",
        log_template=(
            'Handle id "{handle_id}" is used more than once on node "{node_id}".'
        ),
        user_template=(
            '"{node_label}" has two connection points named {handle_label}.'
        ),
    ),
    "UNKNOWN_NODE": IssueDefinition(
        severity="error",
        log_template='Edge "{edge_id}" references unknown node "{node_id}".',
        user_template="A connection points at a step that is not in this workflow.",
    ),
    "UNKNOWN_HANDLE": IssueDefinition(
        severity="error",
        log_template=(
            'Edge "{edge_id}" references unknown handle "{handle_id}" '
            'on node "{node_id}".'
        ),
        user_template=(
            'A connection uses a connection point that "{node_label}" does not have.'
        ),
    ),
    "HANDLES_DO_NOT_MATCH_CATALOG": IssueDefinition(
        severity="error",
        log_template='Node "{node_id}" handles do not match the {node_type} catalog.',
        user_template=(
            'The inputs and outputs of "{node_label}" are not the ones a '
            "{node_type} step has."
        ),
    ),
    "INVALID_HANDLE_DIRECTION": IssueDefinition(
        severity="error",
        log_template=(
            'Edge "{edge_id}" must start at an output handle and end at an '
            "input handle."
        ),
        user_template="A connection must start at an output and end at an input.",
    ),
    "INCOMPATIBLE_HANDLE_TYPES": IssueDefinition(
        severity="error",
        log_template=(
            'Edge "{edge_id}" connects a {source_type} output to a '
            "{target_type} input."
        ),
        user_template=(
            'The {source_label} output on "{source_node_label}" cannot feed the '
            '{target_label} input on "{target_node_label}" '
            "({source_type} to {target_type})."
        ),
    ),
    "INPUT_ALREADY_CONNECTED": IssueDefinition(
        severity="error",
        log_template=(
            'Input "{handle_id}" on node "{node_id}" already has an incoming edge.'
        ),
        user_template=(
            'The {handle_label} input on "{node_label}" already has a connection.'
        ),
    ),
    "REQUIRED_INPUT_DISCONNECTED": IssueDefinition(
        severity="warning",
        log_template=(
            'Required input "{handle_id}" on node "{node_id}" is not connected.'
        ),
        user_template=(
            'The {handle_label} input on "{node_label}" still needs a connection.'
        ),
    ),
    "REQUIRED_OUTPUT_DISCONNECTED": IssueDefinition(
        severity="warning",
        log_template=(
            'Required output "{handle_id}" on node "{node_id}" is not connected.'
        ),
        user_template=(
            'The {handle_label} output on "{node_label}" still needs a connection.'
        ),
    ),
    "CYCLE_DETECTED": IssueDefinition(
        severity="error",
        log_template='Edge "{edge_id}" closes a cycle.',
        user_template=(
            'The connection from "{source_node_label}" back to '
            '"{target_node_label}" creates a loop.'
        ),
    ),
}


def issue_severity(issue_code: str) -> Severity:
    return ISSUE_DEFINITIONS[issue_code].severity


def render_log_message(issue_code: str, message_values: dict[str, str]) -> str:
    return ISSUE_DEFINITIONS[issue_code].log_template.format(**message_values)


def render_user_message(issue_code: str, message_values: dict[str, str]) -> str:
    return ISSUE_DEFINITIONS[issue_code].user_template.format(**message_values)


def handle_types_are_compatible(source_data_type: str, target_data_type: str) -> bool:
    return source_data_type == target_data_type
