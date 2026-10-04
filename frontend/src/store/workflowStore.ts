import { applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from "@xyflow/react";
import { create } from "zustand";

import {
  createWorkflow as createWorkflowOnServer,
  deleteWorkflow as deleteWorkflowOnServer,
  getWorkflow,
  isWorkflowNotFound,
  listWorkflows,
  updateWorkflow,
} from "@/api/workflows";
import type {
  ValidationResult,
  Workflow,
  WorkflowDocument,
  WorkflowSummary,
} from "@/types/workflow";
import type { NodeType } from "@/types/workflow";

import type { FlowEdge, FlowNode } from "@/types/flowTypes";
import { buildWorkflowWrite, mapWorkflowToFlowGraph } from "@library/mapWorkflow";
import { createFlowNode, nodeWithUpdatedDetails } from "@library/nodeFactory";

const POSITION_SAVE_DELAY_MS = 400;

export type EditorRequestState =
  | "idle"
  | "loading"
  | "saving"
  | "saved"
  | "networkError"
  | "notFound";

type WorkflowEditorData = {
  workflows: WorkflowSummary[];
  activeWorkflowId: string | null;
  workflowName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  validation: ValidationResult | null;
  requestState: EditorRequestState;
  saveFailureDialogIsOpen: boolean;
  hasLoadedWorkflowList: boolean;
};

type NodePositionChange = Extract<NodeChange<FlowNode>, { type: "position" }>;

function emptyWorkflowEditor(): WorkflowEditorData {
  return {
    workflows: [],
    activeWorkflowId: null,
    workflowName: "",
    nodes: [],
    edges: [],
    validation: null,
    requestState: "idle",
    saveFailureDialogIsOpen: false,
    hasLoadedWorkflowList: false,
  };
}

type WorkflowEditorState = WorkflowEditorData & {
  loadWorkflowList: () => Promise<void>;
  selectWorkflow: (workflowId: string) => Promise<void>;
  createEmptyWorkflow: (workflowName?: string) => Promise<void>;
  deleteActiveWorkflow: () => Promise<void>;
  renameWorkflow: (workflowName: string) => void;
  addNode: (
    nodeType: NodeType,
    nodeLabel: string,
    outputLabels: Record<string, string>,
  ) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  updateNodeDetails: (
    nodeId: string,
    nodeLabel: string,
    outputLabels: Record<string, string>,
  ) => void;
  connecHandles: (connection: Connection) => void;
  applyCanvasNodeChanges: (changes: NodeChange<FlowNode>[]) => void;
  applyCanvasEdgeChanges: (changes: EdgeChange<FlowEdge>[]) => void;
  retrySave: () => void;
  resetWorkflowEditorForTests: () => void;
};

export const useWorkflowStore = create<WorkflowEditorState>((set, get) => {
  let saveSequence: Promise<void> = Promise.resolve();
  let latestSaveGeneration = 0;
  let positionSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let nodeDragIsActive = false;

  function applyLoadedWorkflow(workflowDocument: WorkflowDocument) {
    const workflow = workflowDocument.workflow;
    const flowGraph = mapWorkflowToFlowGraph(workflow);
    set({
      ...savedWorkflowFields(workflowDocument),
      activeWorkflowId: workflow.id,
      nodes: flowGraph.nodes,
      edges: flowGraph.edges,
    });
  }

  function applySavedWorkflow(workflowDocument: WorkflowDocument) {
    set(savedWorkflowFields(workflowDocument));
  }

  function savedWorkflowFields(workflowDocument: WorkflowDocument) {
    const workflow = workflowDocument.workflow;
    return {
      workflowName: workflow.name,
      validation: workflowDocument.validation,
      requestState: "saved" as const,
      saveFailureDialogIsOpen: false,
      workflows: replaceWorkflowSummary(get().workflows, workflow),
    };
  }

  function applyRequestFailure(error: unknown) {
    if (isWorkflowNotFound(error)) {
      clearMissingWorkflow();
      return;
    }
    set({ requestState: "networkError" });
  }

  function clearMissingWorkflow() {
    const activeWorkflowId = get().activeWorkflowId;
    set({
      requestState: "notFound",
      saveFailureDialogIsOpen: false,
      activeWorkflowId: null,
      nodes: [],
      edges: [],
      validation: null,
      workflows: workflowsExcept(get().workflows, activeWorkflowId),
    });
  }

  function cancelPositionSaveTimer() {
    if (positionSaveTimer === null) return;
    clearTimeout(positionSaveTimer);
    positionSaveTimer = null;
  }

  function saveIsNoLongerLatest(saveGeneration: number): boolean {
    return saveGeneration !== latestSaveGeneration;
  }

  function workflowIsReadyToSave(
    workflowId: string | null,
    workflowName: string,
  ): workflowId is string {
    if (!workflowId) return false;
    if (!workflowNameCanBeSaved(workflowName)) return false;
    return get().requestState !== "loading";
  }

  function saveWasOvertaken(saveGeneration: number, workflowId: string): boolean {
    if (saveIsNoLongerLatest(saveGeneration)) return true;
    return get().activeWorkflowId !== workflowId;
  }

  function recordSaveFailure(error: unknown) {
    applyRequestFailure(error);
    if (isWorkflowNotFound(error)) return;
    set({ saveFailureDialogIsOpen: true });
  }

  async function persistWorkflow(saveGeneration: number): Promise<void> {
    if (saveIsNoLongerLatest(saveGeneration)) return;
    const workflowId = get().activeWorkflowId;
    const workflowName = get().workflowName;
    if (!workflowIsReadyToSave(workflowId, workflowName)) return;
    await sendWorkflowUpdate(saveGeneration, workflowId, workflowName);
  }

  async function sendWorkflowUpdate(
    saveGeneration: number,
    workflowId: string,
    workflowName: string,
  ): Promise<void> {
    set({ requestState: "saving" });
    try {
      const workflowDocument = await updateWorkflow(
        workflowId,
        buildWorkflowWrite(workflowName, get().nodes, get().edges),
      );
      if (saveWasOvertaken(saveGeneration, workflowId)) return;
      applySavedWorkflow(workflowDocument);
    } catch (error) {
      if (saveWasOvertaken(saveGeneration, workflowId)) return;
      recordSaveFailure(error);
    }
  }

  function queueWorkflowSave(): Promise<void> {
    const saveGeneration = nextSaveGeneration();
    const saveTask = saveSequence.then(() => persistWorkflow(saveGeneration));
    // todo: handle and log failed saves better
    saveSequence = saveQueueIgnoringFailure(saveTask);
    return saveTask;
  }

  function nextSaveGeneration(): number {
    latestSaveGeneration += 1;
    return latestSaveGeneration;
  }

  function discardInFlightSaves() {
    latestSaveGeneration += 1;
  }

  function schedulePositionSave() {
    cancelPositionSaveTimer();
    positionSaveTimer = setTimeout(saveDraggedNodePosition, POSITION_SAVE_DELAY_MS);
  }

  function saveDraggedNodePosition() {
    positionSaveTimer = null;
    void queueWorkflowSave();
  }

  function flushPendingWorkflowSave(): Promise<void> {
    if (positionSaveTimer === null) return saveSequence;
    cancelPositionSaveTimer();
    return queueWorkflowSave();
  }

  function removeNodesAndTheirEdges(nodeIds: string[]) {
    if (nodeIds.length === 0) return;
    const removedNodeIds = new Set(nodeIds);
    set({
      nodes: nodesExcept(get().nodes, removedNodeIds),
      edges: edgesNotTouching(get().edges, removedNodeIds),
    });
    void queueWorkflowSave();
  }

  function storeNodes(nodes: FlowNode[]) {
    set({ nodes });
    void queueWorkflowSave();
  }

  function workflowListAlreadyRequested(): boolean {
    if (get().hasLoadedWorkflowList) return true;
    return get().requestState === "loading";
  }

  async function openFirstStoredWorkflow(workflows: WorkflowSummary[]) {
    set({ workflows });
    if (workflows.length === 0) {
      await get().createEmptyWorkflow();
      return;
    }
    const firstWorkflow = workflows[0];
    applyLoadedWorkflow(await getWorkflow(firstWorkflow.id));
  }

  function recordWorkflowListFailure(error: unknown) {
    set({ requestState: "networkError", hasLoadedWorkflowList: false });
    applyRequestFailure(error);
  }

  async function loadWorkflowList() {
    if (workflowListAlreadyRequested()) return;
    set({ requestState: "loading", hasLoadedWorkflowList: true });
    try {
      await openFirstStoredWorkflow(await listWorkflows());
    } catch (error) {
      recordWorkflowListFailure(error);
    }
  }

  function activeWorkflowChanged(workflowId: string): boolean {
    return get().activeWorkflowId !== workflowId;
  }

  async function selectWorkflow(workflowId: string) {
    if (workflowId === get().activeWorkflowId) return;
    await flushPendingWorkflowSave();
    set({ requestState: "loading", activeWorkflowId: workflowId });
    try {
      const workflowDocument = await getWorkflow(workflowId);
      if (activeWorkflowChanged(workflowId)) return;
      applyLoadedWorkflow(workflowDocument);
    } catch (error) {
      if (activeWorkflowChanged(workflowId)) return;
      applyRequestFailure(error);
    }
  }

  async function createEmptyWorkflow(workflowName?: string) {
    const trimmedName = workflowName?.trim() || "Untitled workflow";
    await flushPendingWorkflowSave();
    set({ requestState: "saving" });
    try {
      applyLoadedWorkflow(await createBlankWorkflow(trimmedName));
    } catch (error) {
      applyRequestFailure(error);
    }
  }

  async function openRemainingWorkflow(deletedWorkflowId: string) {
    const remainingWorkflows = workflowsExcept(get().workflows, deletedWorkflowId);
    set({ workflows: remainingWorkflows, activeWorkflowId: null });
    const neighbour = remainingWorkflows[0];
    if (!neighbour) {
      await get().createEmptyWorkflow();
      return;
    }
    applyLoadedWorkflow(await getWorkflow(neighbour.id));
  }

  async function deleteActiveWorkflow() {
    const workflowId = get().activeWorkflowId;
    if (!workflowId) return;
    await flushPendingWorkflowSave();
    discardInFlightSaves();
    try {
      await deleteWorkflowOnServer(workflowId);
      await openRemainingWorkflow(workflowId);
    } catch (error) {
      applyRequestFailure(error);
    }
  }

  function renameWorkflow(workflowName: string) {
    set({ workflowName });
    if (!workflowNameCanBeSaved(workflowName)) return;
    void queueWorkflowSave();
  }

  function addNode(
    nodeType: NodeType,
    nodeLabel: string,
    outputLabels: Record<string, string>,
  ) {
    const trimmedLabel = trimmedNodeLabel(nodeLabel);
    if (!trimmedLabel) return;
    storeNodes([
      ...get().nodes,
      createFlowNode({
        nodeType,
        label: trimmedLabel,
        outputLabels,
        position: nextNodePosition(get().nodes.length),
      }),
    ]);
  }

  function deleteNode(nodeId: string) {
    removeNodesAndTheirEdges([nodeId]);
  }

  function deleteEdge(edgeId: string) {
    get().applyCanvasEdgeChanges([{ type: "remove", id: edgeId }]);
  }

  function updateNodeDetails(
    nodeId: string,
    nodeLabel: string,
    outputLabels: Record<string, string>,
  ) {
    const trimmedLabel = trimmedNodeLabel(nodeLabel);
    if (!trimmedLabel) return;
    replaceNodeDetails(nodeId, trimmedLabel, outputLabels);
    void queueWorkflowSave();
  }

  function replaceNodeDetails(
    nodeId: string,
    trimmedLabel: string,
    outputLabels: Record<string, string>,
  ) {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? nodeWithUpdatedDetails(node, trimmedLabel, outputLabels)
          : node,
      ),
    });
  }

  function connecHandles(connection: Connection) {
    if (!connectionHasBothEnds(connection)) return;
    set({ edges: [...get().edges, edgeFromConnection(connection)] });
    void queueWorkflowSave();
  }

  function applyNonRemovalNodeChanges(changes: NodeChange<FlowNode>[]) {
    const changesToApply = nodeChangesExceptRemovals(changes);
    if (changesToApply.length === 0) return;
    set({ nodes: applyNodeChanges(changesToApply, get().nodes) });
  }

  function finishNodeDrag() {
    nodeDragIsActive = false;
    cancelPositionSaveTimer();
    void queueWorkflowSave();
  }

  function rememberNodeDrag(changes: NodeChange<FlowNode>[]) {
    const draggedNodePositions = positionChangesIn(changes);
    const dragStarted = dragHasStarted(draggedNodePositions);
    const dragFinished = dragHasFinished(draggedNodePositions);
    if (dragStarted) nodeDragIsActive = true;
    if (!nodeDragIsActive) return;
    if (!dragStarted && !dragFinished) return;
    if (dragFinished) {
      finishNodeDrag();
      return;
    }
    schedulePositionSave();
  }

  function applyCanvasNodeChanges(changes: NodeChange<FlowNode>[]) {
    applyNonRemovalNodeChanges(changes);
    rememberNodeDrag(changes);
    removeNodesAndTheirEdges(removedNodeIdsFrom(changes));
  }

  function applyCanvasEdgeChanges(changes: EdgeChange<FlowEdge>[]) {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    if (!edgeWasRemoved(changes)) return;
    void queueWorkflowSave();
  }

  function retrySave() {
    void queueWorkflowSave();
  }

  function resetWorkflowEditorForTests() {
    discardInFlightSaves();
    nodeDragIsActive = false;
    cancelPositionSaveTimer();
    saveSequence = Promise.resolve();
    set(emptyWorkflowEditor());
  }

  return {
    ...emptyWorkflowEditor(),
    loadWorkflowList,
    selectWorkflow,
    createEmptyWorkflow,
    deleteActiveWorkflow,
    renameWorkflow,
    addNode,
    deleteNode,
    deleteEdge,
    updateNodeDetails,
    connecHandles,
    applyCanvasNodeChanges,
    applyCanvasEdgeChanges,
    retrySave,
    resetWorkflowEditorForTests,
  };
});

function workflowNameCanBeSaved(workflowName: string): boolean {
  return workflowName.trim().length > 0;
}

function trimmedNodeLabel(nodeLabel: string): string | null {
  const trimmedLabel = nodeLabel.trim();
  if (trimmedLabel.length === 0) return null;
  return trimmedLabel;
}

function workflowSummaryFrom(workflow: Workflow): WorkflowSummary {
  return {
    id: workflow.id,
    name: workflow.name,
    status: workflow.status,
  };
}

function replaceWorkflowSummary(
  summaries: WorkflowSummary[],
  workflow: Workflow,
): WorkflowSummary[] {
  const nextSummary = workflowSummaryFrom(workflow);
  const summaryAlreadyListed = summaries.some(
    (summary) => summary.id === workflow.id,
  );
  if (!summaryAlreadyListed) return [...summaries, nextSummary];
  return summaries.map((summary) =>
    summary.id === workflow.id ? nextSummary : summary,
  );
}

function workflowsExcept(
  workflows: WorkflowSummary[],
  workflowId: string | null,
): WorkflowSummary[] {
  return workflows.filter((summary) => summary.id !== workflowId);
}

function nodesExcept(nodes: FlowNode[], removedNodeIds: Set<string>): FlowNode[] {
  return nodes.filter((node) => !removedNodeIds.has(node.id));
}

function edgesNotTouching(edges: FlowEdge[], removedNodeIds: Set<string>): FlowEdge[] {
  return edges.filter(
    (edge) =>
      !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target),
  );
}

function removedNodeIdsFrom(changes: NodeChange<FlowNode>[]): string[] {
  return changes
    .filter((change) => change.type === "remove")
    .map((change) => change.id);
}

function nodeChangesExceptRemovals(
  changes: NodeChange<FlowNode>[],
): NodeChange<FlowNode>[] {
  return changes.filter((change) => change.type !== "remove");
}

function positionChangesIn(changes: NodeChange<FlowNode>[]): NodePositionChange[] {
  return changes.filter(
    (change): change is NodePositionChange => change.type === "position",
  );
}

function dragHasStarted(draggedNodePositions: NodePositionChange[]): boolean {
  return draggedNodePositions.some(
    (positionChange) => positionChange.dragging === true,
  );
}

function dragHasFinished(draggedNodePositions: NodePositionChange[]): boolean {
  return draggedNodePositions.some(
    (positionChange) => positionChange.dragging === false,
  );
}

function edgeWasRemoved(changes: EdgeChange<FlowEdge>[]): boolean {
  return changes.some((change) => change.type === "remove");
}

function connectionHasBothEnds(connection: Connection): boolean {
  return Boolean(connection.source && connection.target);
}

function edgeFromConnection(connection: Connection): FlowEdge {
  return {
    id: crypto.randomUUID(),
    source: connection.source ?? "",
    target: connection.target ?? "",
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  };
}

function createBlankWorkflow(workflowName: string): Promise<WorkflowDocument> {
  return createWorkflowOnServer({
    name: workflowName,
    nodes: [],
    edges: [],
  });
}

function saveQueueIgnoringFailure(saveTask: Promise<void>): Promise<void> {
  return saveTask.catch(() => undefined);
}

function nextNodePosition(existingNodeCount: number): { x: number; y: number } {
  return {
    x: 80 + (existingNodeCount % 4) * 48,
    y: 80 + existingNodeCount * 28,
  };
}
