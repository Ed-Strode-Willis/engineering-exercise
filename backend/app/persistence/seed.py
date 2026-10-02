"""The workflow the editor opens on a fresh process."""

from app.models import (
    NodeType,
    Position,
    Workflow,
    WorkflowEdge,
    WorkflowNode,
    WorkflowNodeData,
)
from app.validation.catalog import NODE_CATALOG

EXAMPLE_PIPELINE_ID = "example-pipeline"
EXAMPLE_PIPELINE_NAME = "Load, transform, train"


def build_example_pipeline() -> Workflow:
    return Workflow(
        id=EXAMPLE_PIPELINE_ID,
        name=EXAMPLE_PIPELINE_NAME,
        status="valid",
        nodes=[
            with_output_label(
                build_catalog_node(
                    "datasource-1",
                    "DataSource",
                    "Load Dataset",
                    Position(x=80, y=180),
                ),
                "Raw rows",
            ),
            with_output_label(
                build_catalog_node(
                    "transform-1",
                    "Transform",
                    "Transform Dataset",
                    Position(x=640, y=180),
                ),
                "Prepared rows",
            ),
            with_output_label(
                build_catalog_node(
                    "model-1",
                    "Model",
                    "Train Model",
                    Position(x=1200, y=180),
                ),
                "Trained model",
            ),
        ],
        edges=[
            WorkflowEdge(
                id="edge-1",
                source_node_id="datasource-1",
                source_handle_id="dataset",
                target_node_id="transform-1",
                target_handle_id="dataset",
            ),
            WorkflowEdge(
                id="edge-2",
                source_node_id="transform-1",
                source_handle_id="dataset",
                target_node_id="model-1",
                target_handle_id="dataset",
            ),
        ],
    )


def with_output_label(node: WorkflowNode, output_label: str) -> WorkflowNode:
    renamed_outputs = [
        output.model_copy(update={"label": output_label})
        for output in node.data.outputs
    ]
    return node.model_copy(
        update={"data": node.data.model_copy(update={"outputs": renamed_outputs})}
    )


def build_catalog_node(
    node_id: str,
    node_type: NodeType,
    label: str,
    position: Position,
) -> WorkflowNode:
    catalog_entry = NODE_CATALOG[node_type]
    return WorkflowNode(
        id=node_id,
        type=node_type,
        position=position,
        data=WorkflowNodeData(
            label=label,
            inputs=[handle.model_copy() for handle in catalog_entry.inputs],
            outputs=[handle.model_copy() for handle in catalog_entry.outputs],
        ),
    )
