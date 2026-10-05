import { useEffect, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type EdgeTypes,
  type FinalConnectionState,
  type NodeTypes,
} from "@xyflow/react";

import type { FlowEdge } from "@/types/flowTypes";

import {
  isEdgeConnectionValid,
  type ProposedEdgeConnection,
} from "@library/isEdgeConnectionValid";
import { useWorkflowStore } from "@store/workflowStore";
import { CanvasMinimap } from "./CanvasMinimap";
import { ConnectionRefusalToast } from "./ConnectionRefusalToast";
import { WorkflowEdge } from "./WorkflowEdge";
import { WorkflowNode } from "./WorkflowNode";

function draggedEdgeMayLand(connection: Connection | FlowEdge): boolean {
  if (!connection.source || !connection.target) return true;
  return isEdgeConnectionValid(
    proposedConnection(connection),
    useWorkflowStore.getState().nodes,
    useWorkflowStore.getState().edges,
  ).connectionIsValid;
}

function refuseDroppedEdge(
  connectionState: FinalConnectionState,
  showRefusal: (refusalMessage: string) => void,
) {
  if (connectionState.isValid === true) return;
  const droppedConnection = proposedConnectionFromDrag(connectionState);
  if (!droppedConnection) return;
  const decision = isEdgeConnectionValid(
    droppedConnection,
    useWorkflowStore.getState().nodes,
    useWorkflowStore.getState().edges,
  );
  if (decision.connectionIsValid) return;
  showRefusal(decision.refusalMessage);
}

function proposedConnection(connection: Connection | FlowEdge): ProposedEdgeConnection {
  return {
    sourceNodeId: connection.source ?? "",
    sourceHandleId: connection.sourceHandle ?? null,
    targetNodeId: connection.target ?? "",
    targetHandleId: connection.targetHandle ?? null,
  };
}

function proposedConnectionFromDrag(
  connectionState: FinalConnectionState,
): ProposedEdgeConnection | null {
  const dragStartedOnOutput = connectionState.fromHandle?.type === "source";
  const sourceNodeId = dragStartedOnOutput
    ? connectionState.fromNode?.id
    : connectionState.toNode?.id;
  const targetNodeId = dragStartedOnOutput
    ? connectionState.toNode?.id
    : connectionState.fromNode?.id;
  if (!sourceNodeId || !targetNodeId || !connectionState.toHandle) return null;

  return {
    sourceNodeId,
    sourceHandleId: dragStartedOnOutput
      ? (connectionState.fromHandle?.id ?? null)
      : (connectionState.toHandle?.id ?? null),
    targetNodeId,
    targetHandleId: dragStartedOnOutput
      ? (connectionState.toHandle?.id ?? null)
      : (connectionState.fromHandle?.id ?? null),
  };
}

const nodeTypes = { workflowNode: WorkflowNode } satisfies NodeTypes;
const edgeTypes = { default: WorkflowEdge } satisfies EdgeTypes;
const canvasMinimumZoom = 0.1;
const canvasFitViewOptions = { padding: 0.45, maxZoom: 0.75 };

export function WorkflowCanvas() {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const activeWorkflowId = useWorkflowStore((state) => state.activeWorkflowId);
  const requestState = useWorkflowStore((state) => state.requestState);
  const applyCanvasNodeChanges = useWorkflowStore(
    (state) => state.applyCanvasNodeChanges,
  );
  const applyCanvasEdgeChanges = useWorkflowStore(
    (state) => state.applyCanvasEdgeChanges,
  );
  const connectWorkflowHandles = useWorkflowStore(
    (state) => state.connecHandles,
  );
  const [refusal, setRefusal] = useState<{ message: string; shownAt: number } | null>(
    null,
  );
  const canvasIsLocked = requestState === "loading" || requestState === "notFound";

  useEffect(() => {
    if (!refusal) return;
    const hideToast = window.setTimeout(() => setRefusal(null), 3200);
    return () => window.clearTimeout(hideToast);
  }, [refusal]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <ConnectionRefusalToast key={refusal?.shownAt} message={refusal?.message ?? ""} />
      <ReactFlow
        key={activeWorkflowId ?? "empty-canvas"}
        nodes={nodes}
        edges={edges}
        onNodesChange={applyCanvasNodeChanges}
        onEdgesChange={applyCanvasEdgeChanges}
        onConnect={connectWorkflowHandles}
        isValidConnection={draggedEdgeMayLand}
        onConnectEnd={(_pointerEvent, connectionState) =>
          refuseDroppedEdge(connectionState, (refusalMessage) =>
            setRefusal({ message: refusalMessage, shownAt: Date.now() }),
          )
        }
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={canvasMinimumZoom}
        fitViewOptions={canvasFitViewOptions}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!canvasIsLocked}
        nodesConnectable={!canvasIsLocked}
        elementsSelectable={!canvasIsLocked}
        defaultEdgeOptions={{ style: { stroke: "#a3a3a3", strokeWidth: 1.5 } }}
      >
        <Background color="#e5e5e5" gap={20} />
        <Controls className="!overflow-hidden !rounded-lg !border !border-neutral-200 !shadow-sm" />
        <CanvasMinimap />
      </ReactFlow>
    </div>
  );
}
