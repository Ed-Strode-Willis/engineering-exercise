import type { FlowEdge, FlowNode } from "@/types/flowTypes";
import type { HandleDefinition } from "@/types/workflow";

/**
 * Application logic for the edge the user is drawing.
 * The server still checks the saved workflow. This only answers, while the
 * edge is over a handle, whether that handle's data type matches, whether the
 * edge would close a loop, and whether the input already has a connection.
 */

export type ProposedEdgeConnection = {
  sourceNodeId: string;
  sourceHandleId: string | null;
  targetNodeId: string;
  targetHandleId: string | null;
};

export type EdgeConnectionDecision = {
  connectionIsValid: boolean;
  refusalMessage: string;
};

export function isEdgeConnectionValid(
  proposedConnection: ProposedEdgeConnection,
  nodes: FlowNode[],
  edges: FlowEdge[],
): EdgeConnectionDecision {
  if (!handleDataTypesMatch(proposedConnection, nodes)) {
    return refusedConnection(mismatchedHandleMessage(proposedConnection, nodes));
  }
  if (inputAlreadyHasConnection(proposedConnection, edges)) {
    return refusedConnection(occupiedInputMessage(proposedConnection, nodes));
  }
  if (connectionClosesALoop(proposedConnection, edges)) {
    return refusedConnection("This connection creates a loop.");
  }
  return { connectionIsValid: true, refusalMessage: "" };
}

function inputAlreadyHasConnection(
  proposedConnection: ProposedEdgeConnection,
  edges: FlowEdge[],
): boolean {
  return edges.some(
    (edge) =>
      edge.target === proposedConnection.targetNodeId &&
      edge.targetHandle === proposedConnection.targetHandleId,
  );
}

function occupiedInputMessage(
  proposedConnection: ProposedEdgeConnection,
  nodes: FlowNode[],
): string {
  const targetInput = inputHandle(proposedConnection, nodes);
  const dataType = targetInput?.type ?? "data";
  return `A ${dataType} input can only have one connection.`;
}

function connectionClosesALoop(
  proposedConnection: ProposedEdgeConnection,
  edges: FlowEdge[],
): boolean {
  if (proposedConnection.sourceNodeId === proposedConnection.targetNodeId) return true;
  const nodesDownstreamOfTarget = nodeIdsReachedFrom(
    proposedConnection.targetNodeId,
    edges,
  );
  return nodesDownstreamOfTarget.has(proposedConnection.sourceNodeId);
}

function nodeIdsReachedFrom(startNodeId: string, edges: FlowEdge[]): Set<string> {
  const reachedNodeIds = new Set<string>();
  const nodesLeftToVisit = nodeIdsFedBy(startNodeId, edges);
  while (nodesLeftToVisit.length > 0) {
    const nodeId = nodesLeftToVisit.pop();
    if (nodeId === undefined || reachedNodeIds.has(nodeId)) continue;
    reachedNodeIds.add(nodeId);
    nodesLeftToVisit.push(...nodeIdsFedBy(nodeId, edges));
  }
  return reachedNodeIds;
}

function nodeIdsFedBy(nodeId: string, edges: FlowEdge[]): string[] {
  return edges.filter((edge) => edge.source === nodeId).map((edge) => edge.target);
}

function handleDataTypesMatch(
  proposedConnection: ProposedEdgeConnection,
  nodes: FlowNode[],
): boolean {
  const sourceOutput = outputHandle(proposedConnection, nodes);
  const targetInput = inputHandle(proposedConnection, nodes);
  if (!sourceOutput || !targetInput) return false;
  return sourceOutput.type === targetInput.type;
}

function refusedConnection(refusalMessage: string): EdgeConnectionDecision {
  return { connectionIsValid: false, refusalMessage };
}

function mismatchedHandleMessage(
  proposedConnection: ProposedEdgeConnection,
  nodes: FlowNode[],
): string {
  const sourceOutput = outputHandle(proposedConnection, nodes);
  const targetInput = inputHandle(proposedConnection, nodes);
  if (!sourceOutput || !targetInput) return "These data types are incompatible.";
  return `A ${sourceOutput.type} output is incompatible with a ${targetInput.type} input.`;
}

function outputHandle(
  proposedConnection: ProposedEdgeConnection,
  nodes: FlowNode[],
): HandleDefinition | undefined {
  const sourceNode = nodeById(nodes, proposedConnection.sourceNodeId);
  return sourceNode?.data.outputs.find(
    (handle) => handle.id === proposedConnection.sourceHandleId,
  );
}

function inputHandle(
  proposedConnection: ProposedEdgeConnection,
  nodes: FlowNode[],
): HandleDefinition | undefined {
  const targetNode = nodeById(nodes, proposedConnection.targetNodeId);
  return targetNode?.data.inputs.find(
    (handle) => handle.id === proposedConnection.targetHandleId,
  );
}

function nodeById(nodes: FlowNode[], nodeId: string): FlowNode | undefined {
  return nodes.find((node) => node.id === nodeId);
}
