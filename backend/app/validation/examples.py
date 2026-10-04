"""Workflow documents shared by the validation tests and the validator export."""

from app.models import (
    HandleDefinition,
    NodeType,
    Position,
    WorkflowEdge,
    WorkflowNode,
    WorkflowNodeData,
    WorkflowWrite,
)
from app.persistence.seed import build_catalog_node


def workflow_document(
    name: str,
    nodes: list[WorkflowNode],
    edges: list[WorkflowEdge],
) -> WorkflowWrite:
    return WorkflowWrite(name=name, nodes=nodes, edges=edges)


def connect(
    edge_id: str,
    source_node_id: str,
    target_node_id: str,
    source_handle_id: str = "dataset",
    target_handle_id: str = "dataset",
) -> WorkflowEdge:
    return WorkflowEdge(
        id=edge_id,
        source_node_id=source_node_id,
        source_handle_id=source_handle_id,
        target_node_id=target_node_id,
        target_handle_id=target_handle_id,
    )


def place(node_id: str, node_type: NodeType, label: str, x: float = 0) -> WorkflowNode:
    return build_catalog_node(node_id, node_type, label, Position(x=x, y=0))


def valid_pipeline() -> WorkflowWrite:
    return workflow_document(
        "Load, transform, train",
        [
            place("datasource-1", "DataSource", "Load Dataset", 0),
            place("transform-1", "Transform", "Transform Dataset", 300),
            place("model-1", "Model", "Train Model", 600),
        ],
        [
            connect("edge-1", "datasource-1", "transform-1"),
            connect("edge-2", "transform-1", "model-1"),
        ],
    )


def empty_workflow() -> WorkflowWrite:
    return workflow_document("Empty", [], [])


def two_separate_pipelines() -> WorkflowWrite:
    return workflow_document(
        "Two pipelines",
        [
            place("datasource-a", "DataSource", "Load A", 0),
            place("transform-a", "Transform", "Transform A", 300),
            place("model-a", "Model", "Train A", 600),
            place("datasource-b", "DataSource", "Load B", 0),
            place("transform-b", "Transform", "Transform B", 300),
            place("model-b", "Model", "Train B", 600),
        ],
        [
            connect("edge-a1", "datasource-a", "transform-a"),
            connect("edge-a2", "transform-a", "model-a"),
            connect("edge-b1", "datasource-b", "transform-b"),
            connect("edge-b2", "transform-b", "model-b"),
        ],
    )


def disconnected_data_source() -> WorkflowWrite:
    return workflow_document(
        "Loose source",
        [place("datasource-1", "DataSource", "Load Dataset")],
        [],
    )


def self_connected_transform() -> WorkflowWrite:
    return workflow_document(
        "Loop",
        [place("transform-1", "Transform", "Loop")],
        [connect("edge-loop", "transform-1", "transform-1")],
    )


def two_node_cycle() -> WorkflowWrite:
    return workflow_document(
        "Cycle",
        [
            place("transform-1", "Transform", "First"),
            place("transform-2", "Transform", "Second", 300),
        ],
        [
            connect("edge-forward", "transform-1", "transform-2"),
            connect("edge-back", "transform-2", "transform-1"),
        ],
    )


def open_required_output() -> WorkflowWrite:
    return workflow_document(
        "Missing output",
        [
            place("datasource-1", "DataSource", "Load Dataset"),
            place("transform-1", "Transform", "Transform Dataset", 300),
        ],
        [connect("edge-1", "datasource-1", "transform-1")],
    )


def open_required_input() -> WorkflowWrite:
    return workflow_document(
        "Missing input",
        [
            place("transform-1", "Transform", "Transform Dataset"),
            place("model-1", "Model", "Train Model", 300),
        ],
        [connect("edge-1", "transform-1", "model-1")],
    )


def input_already_connected() -> WorkflowWrite:
    return workflow_document(
        "Two sources",
        [
            place("datasource-1", "DataSource", "First source"),
            place("datasource-2", "DataSource", "Second source", 0),
            place("transform-1", "Transform", "Transform Dataset", 300),
        ],
        [
            connect("edge-1", "datasource-1", "transform-1"),
            connect("edge-2", "datasource-2", "transform-1"),
        ],
    )


def incompatible_handle_types() -> WorkflowWrite:
    return workflow_document(
        "Model into transform",
        [
            place("datasource-1", "DataSource", "Load Dataset"),
            place("model-1", "Model", "Train Model", 300),
            place("transform-1", "Transform", "Transform Dataset", 600),
        ],
        [
            connect("edge-train", "datasource-1", "model-1"),
            connect(
                "edge-bad",
                "model-1",
                "transform-1",
                source_handle_id="model",
            ),
        ],
    )


def unknown_node() -> WorkflowWrite:
    return workflow_document(
        "Missing node",
        [place("datasource-1", "DataSource", "Load Dataset")],
        [connect("edge-1", "datasource-1", "missing-node")],
    )


def unknown_handle() -> WorkflowWrite:
    return workflow_document(
        "Missing handle",
        [
            place("datasource-1", "DataSource", "Load Dataset"),
            place("transform-1", "Transform", "Transform Dataset", 300),
        ],
        [
            connect("edge-good", "datasource-1", "transform-1"),
            connect(
                "edge-bad",
                "datasource-1",
                "transform-1",
                target_handle_id="missing",
            ),
        ],
    )


def invalid_handle_direction() -> WorkflowWrite:
    return workflow_document(
        "Backwards",
        [
            place("datasource-1", "DataSource", "Load Dataset"),
            place("model-1", "Model", "Train Model", 300),
            place("transform-1", "Transform", "Transform Dataset", 600),
        ],
        [
            connect("edge-train", "datasource-1", "model-1"),
            connect("edge-backwards", "model-1", "transform-1"),
        ],
    )


def duplicate_node_id() -> WorkflowWrite:
    return workflow_document(
        "Duplicate node",
        [
            place("datasource-1", "DataSource", "Load Dataset"),
            place("datasource-1", "DataSource", "Load Dataset again", 200),
        ],
        [],
    )


def duplicate_edge_id() -> WorkflowWrite:
    pipeline = valid_pipeline()
    duplicated_edges = [
        pipeline.edges[0],
        pipeline.edges[1].model_copy(update={"id": pipeline.edges[0].id}),
    ]
    return workflow_document(pipeline.name, pipeline.nodes, duplicated_edges)


def duplicate_handle_id() -> WorkflowWrite:
    data_source = place("datasource-1", "DataSource", "Load Dataset")
    duplicated_output = data_source.data.outputs[0].model_copy()
    data_source = data_source.model_copy(
        update={
            "data": WorkflowNodeData(
                label=data_source.data.label,
                inputs=[],
                outputs=[data_source.data.outputs[0], duplicated_output],
            )
        }
    )
    return workflow_document("Duplicate handle", [data_source], [])


def handles_do_not_match_catalog() -> WorkflowWrite:
    pipeline = valid_pipeline()
    transform_node = pipeline.nodes[1]
    extra_output = HandleDefinition(id="extra", label="Extra", type="Dataset")
    updated_transform = transform_node.model_copy(
        update={
            "data": WorkflowNodeData(
                label=transform_node.data.label,
                inputs=transform_node.data.inputs,
                outputs=[*transform_node.data.outputs, extra_output],
            )
        }
    )
    updated_nodes = [pipeline.nodes[0], updated_transform, pipeline.nodes[2]]
    return workflow_document(pipeline.name, updated_nodes, pipeline.edges)


def several_independent_failures() -> WorkflowWrite:
    return workflow_document(
        "Several failures",
        [
            place("datasource-loose", "DataSource", "Unused"),
            place("transform-loop", "Transform", "Loop", 200),
            place("model-1", "Model", "Train Model", 400),
            place("transform-bad", "Transform", "Receives a model", 700),
        ],
        [
            connect("edge-loop", "transform-loop", "transform-loop"),
            connect(
                "edge-incompatible",
                "model-1",
                "transform-bad",
                source_handle_id="model",
            ),
        ],
    )


VALIDATION_EXAMPLE_BUILDERS = [
    ("valid pipeline", valid_pipeline),
    ("empty workflow", empty_workflow),
    ("two separate pipelines", two_separate_pipelines),
    ("disconnected data source", disconnected_data_source),
    ("self connected transform", self_connected_transform),
    ("two node cycle", two_node_cycle),
    ("open required output", open_required_output),
    ("open required input", open_required_input),
    ("input already connected", input_already_connected),
    ("incompatible handle types", incompatible_handle_types),
    ("unknown node", unknown_node),
    ("unknown handle", unknown_handle),
    ("invalid handle direction", invalid_handle_direction),
    ("duplicate node id", duplicate_node_id),
    ("duplicate edge id", duplicate_edge_id),
    ("duplicate handle id", duplicate_handle_id),
    ("handles do not match catalog", handles_do_not_match_catalog),
    ("several independent failures", several_independent_failures),
]
