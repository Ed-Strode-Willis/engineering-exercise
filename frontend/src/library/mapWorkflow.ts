import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowWrite,
} from "@/types/workflow";

import type { FlowEdge, FlowNode } from "../types/flowTypes";

export function mapFlowNodeToWorkflowNode(flowNode: FlowNode): WorkflowNode {
  return {
    id: flowNode.id,
    type: flowNode.data.nodeType,
    position: { x: flowNode.position.x, y: flowNode.position.y },
    data: {
      label: flowNode.data.label,
      inputs: flowNode.data.inputs,
      outputs: flowNode.data.outputs,
    },
  };
}

export function mapWorkflowNodeToFlowNode(workflowNode: WorkflowNode): FlowNode {
  return {
    id: workflowNode.id,
    type: "workflowNode",
    position: {
      x: workflowNode.position.x,
      y: workflowNode.position.y,
    },
    data: {
      label: workflowNode.data.label,
      nodeType: workflowNode.type,
      inputs: workflowNode.data.inputs ?? [],
      outputs: workflowNode.data.outputs ?? [],
    },
  };
}

export function mapFlowEdgeToWorkflowEdge(flowEdge: FlowEdge): WorkflowEdge {
  return {
    id: flowEdge.id,
    sourceNodeId: flowEdge.source,
    sourceHandleId: flowEdge.sourceHandle ?? "",
    targetNodeId: flowEdge.target,
    targetHandleId: flowEdge.targetHandle ?? "",
  };
}

export function mapWorkflowEdgeToFlowEdge(workflowEdge: WorkflowEdge): FlowEdge {
  return {
    id: workflowEdge.id,
    source: workflowEdge.sourceNodeId,
    target: workflowEdge.targetNodeId,
    sourceHandle: workflowEdge.sourceHandleId,
    targetHandle: workflowEdge.targetHandleId,
  };
}

export function buildWorkflowWrite(
  workflowName: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
): WorkflowWrite {
  return {
    name: workflowName.trim(),
    nodes: nodes.map(mapFlowNodeToWorkflowNode),
    edges: edges.map(mapFlowEdgeToWorkflowEdge),
  };
}

export function mapWorkflowToFlowGraph(workflow: Workflow): {
  nodes: FlowNode[];
  edges: FlowEdge[];
} {
  return {
    nodes: (workflow.nodes ?? []).map(mapWorkflowNodeToFlowNode),
    edges: (workflow.edges ?? []).map(mapWorkflowEdgeToFlowEdge),
  };
}
