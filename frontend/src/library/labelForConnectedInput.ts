import type { HandleDefinition } from "@/types/workflow";

import type { FlowEdge, FlowNode } from "../types/flowTypes";

const multipleOutputsLabel = "Multiple";

export function labelForConnectedInput(
  inputHandle: HandleDefinition,
  nodeId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
): string {
  const incomingEdges = edgesThatTargetInput(edges, nodeId, inputHandle.id);
  if (incomingEdges.length > 1) return multipleOutputsLabel;
  const onlyIncomingEdge = incomingEdges[0];
  if (!onlyIncomingEdge) return inputHandle.label;
  return outputLabelForEdge(nodes, onlyIncomingEdge) ?? inputHandle.label;
}

function edgesThatTargetInput(
  edges: FlowEdge[],
  nodeId: string,
  inputHandleId: string,
): FlowEdge[] {
  return edges.filter(
    (edge) => edge.target === nodeId && edge.targetHandle === inputHandleId,
  );
}

function outputLabelForEdge(nodes: FlowNode[], edge: FlowEdge): string | null {
  const sourceNode = nodes.find((node) => node.id === edge.source);
  if (!sourceNode) return null;
  const outputHandle = sourceNode.data.outputs.find(
    (output) => output.id === edge.sourceHandle,
  );
  if (!outputHandle?.label) return null;
  return outputHandle.label;
}
