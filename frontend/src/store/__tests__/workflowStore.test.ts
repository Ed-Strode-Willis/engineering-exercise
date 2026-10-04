import { AxiosError, type AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
} from "@/api/workflows";
import type { WorkflowNode } from "@/types/workflow";
import type { FlowEdge, FlowNode } from "@/types/flowTypes";

import { useWorkflowStore } from "@store/workflowStore";

vi.mock("@/api/workflows", async () => {
  const actual = await vi.importActual<typeof import("@/api/workflows")>(
    "@/api/workflows",
  );
  return {
    ...actual,
    listWorkflows: vi.fn(),
    getWorkflow: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    deleteWorkflow: vi.fn(),
  };
});

const updateWorkflowMock = vi.mocked(updateWorkflow);
const listWorkflowsMock = vi.mocked(listWorkflows);
const getWorkflowMock = vi.mocked(getWorkflow);
const createWorkflowMock = vi.mocked(createWorkflow);
const deleteWorkflowMock = vi.mocked(deleteWorkflow);

function savedDocument(
  name: string,
  options: {
    workflowId?: string;
    status?: "valid" | "invalid";
    nodes?: WorkflowNode[];
  } = {},
) {
  const status = options.status ?? "valid";
  return {
    workflow: {
      id: options.workflowId ?? "workflow-1",
      name,
      status,
      nodes: options.nodes ?? [],
      edges: [],
    },
    validation: { valid: status === "valid", errors: [], warnings: [] },
  };
}

function storedNode(nodeId: string, label: string): WorkflowNode {
  return {
    id: nodeId,
    type: "DataSource",
    position: { x: 10, y: 20 },
    data: {
      label,
      inputs: [],
      outputs: [
        { id: "dataset", label: "Dataset", type: "Dataset", required: true },
      ],
    },
  };
}

function canvasNode(nodeId: string, label: string): FlowNode {
  return {
    id: nodeId,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      label,
      nodeType: "DataSource",
      inputs: [],
      outputs: [
        { id: "dataset", label: "Dataset", type: "Dataset", required: true },
      ],
    },
  };
}

function canvasEdge(
  edgeId: string,
  sourceNodeId: string,
  targetNodeId: string,
): FlowEdge {
  return {
    id: edgeId,
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle: "dataset",
    targetHandle: "dataset",
  };
}

function openSavedWorkflow() {
  useWorkflowStore.setState({
    activeWorkflowId: "workflow-1",
    workflowName: "Pipeline",
    workflows: [{ id: "workflow-1", name: "Pipeline", status: "valid" }],
    nodes: [],
    edges: [],
    requestState: "saved",
    hasLoadedWorkflowList: true,
  });
}

function axiosResponse(status: number, data: unknown): AxiosError {
  return new AxiosError("request failed", String(status), undefined, undefined, {
    status,
    data,
    statusText: "error",
    headers: {},
    config: { headers: {} },
  } as AxiosResponse);
}

describe("workflow store", () => {
  beforeEach(() => {
    useWorkflowStore.getState().resetWorkflowEditorForTests();
    vi.clearAllMocks();
  });

  it("saves a rename and keeps the server's validation", async () => {
    useWorkflowStore.setState({
      activeWorkflowId: "workflow-1",
      workflowName: "Old name",
      nodes: [],
      edges: [],
      requestState: "idle",
      saveFailureDialogIsOpen: true,
      hasLoadedWorkflowList: true,
    });
    updateWorkflowMock.mockResolvedValue(savedDocument("Renamed"));

    useWorkflowStore.getState().renameWorkflow("Renamed");

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("saved");
    });
    expect(updateWorkflowMock).toHaveBeenCalledWith(
      "workflow-1",
      expect.objectContaining({ name: "Renamed" }),
    );
    expect(useWorkflowStore.getState().validation?.valid).toBe(true);
    expect(useWorkflowStore.getState().workflowName).toBe("Renamed");
    expect(useWorkflowStore.getState().saveFailureDialogIsOpen).toBe(false);
  });

  it("keeps the local graph when the server cannot be reached", async () => {
    useWorkflowStore.setState({
      activeWorkflowId: "workflow-1",
      workflowName: "Pipeline",
      nodes: [
        {
          id: "datasource-1",
          type: "workflowNode",
          position: { x: 0, y: 0 },
          data: {
            label: "Load",
            nodeType: "DataSource",
            inputs: [],
            outputs: [
              {
                id: "dataset",
                label: "Dataset",
                type: "Dataset",
                required: true,
              },
            ],
          },
        },
      ],
      edges: [],
      requestState: "saved",
      hasLoadedWorkflowList: true,
    });
    updateWorkflowMock.mockRejectedValue(new AxiosError("offline"));

    useWorkflowStore.getState().renameWorkflow("Offline rename");

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("networkError");
      expect(useWorkflowStore.getState().saveFailureDialogIsOpen).toBe(true);
    });
    expect(useWorkflowStore.getState().nodes).toHaveLength(1);
    expect(useWorkflowStore.getState().workflowName).toBe("Offline rename");
  });

  it("clears the canvas when the workflow no longer exists", async () => {
    useWorkflowStore.setState({
      activeWorkflowId: "workflow-1",
      workflowName: "Pipeline",
      workflows: [{ id: "workflow-1", name: "Pipeline", status: "invalid" }],
      nodes: [],
      edges: [],
      saveFailureDialogIsOpen: true,
      hasLoadedWorkflowList: true,
    });
    updateWorkflowMock.mockRejectedValue(
      axiosResponse(404, { detail: "Workflow not found" }),
    );

    useWorkflowStore.getState().renameWorkflow("Missing");

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("notFound");
    });
    expect(useWorkflowStore.getState().activeWorkflowId).toBeNull();
    expect(useWorkflowStore.getState().nodes).toEqual([]);
    expect(useWorkflowStore.getState().saveFailureDialogIsOpen).toBe(false);
  });

  it("loads the first saved workflow", async () => {
    listWorkflowsMock.mockResolvedValue([
      { id: "workflow-1", name: "Load, transform, train", status: "valid" },
    ]);
    getWorkflowMock.mockResolvedValue(
      savedDocument("Load, transform, train"),
    );

    await useWorkflowStore.getState().loadWorkflowList();

    expect(useWorkflowStore.getState().activeWorkflowId).toBe("workflow-1");
    expect(useWorkflowStore.getState().requestState).toBe("saved");
  });

  it("creates an untitled workflow when none are saved", async () => {
    listWorkflowsMock.mockResolvedValue([]);
    createWorkflowMock.mockResolvedValue(
      savedDocument("Untitled workflow", { workflowId: "workflow-new" }),
    );

    await useWorkflowStore.getState().loadWorkflowList();

    expect(createWorkflowMock).toHaveBeenCalledWith({
      name: "Untitled workflow",
      nodes: [],
      edges: [],
    });
    expect(useWorkflowStore.getState().activeWorkflowId).toBe("workflow-new");
    expect(useWorkflowStore.getState().workflowName).toBe("Untitled workflow");
  });

  it("loads the list again after a failed load", async () => {
    listWorkflowsMock.mockRejectedValueOnce(new AxiosError("offline"));

    await useWorkflowStore.getState().loadWorkflowList();

    expect(useWorkflowStore.getState().requestState).toBe("networkError");
    listWorkflowsMock.mockResolvedValue([
      { id: "workflow-1", name: "Pipeline", status: "valid" },
    ]);
    getWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

    await useWorkflowStore.getState().loadWorkflowList();

    expect(useWorkflowStore.getState().activeWorkflowId).toBe("workflow-1");
    expect(useWorkflowStore.getState().requestState).toBe("saved");
  });

  it("does not load the list twice", async () => {
    listWorkflowsMock.mockResolvedValue([
      { id: "workflow-1", name: "Pipeline", status: "valid" },
    ]);
    getWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

    await useWorkflowStore.getState().loadWorkflowList();
    await useWorkflowStore.getState().loadWorkflowList();

    expect(listWorkflowsMock).toHaveBeenCalledTimes(1);
    expect(getWorkflowMock).toHaveBeenCalledTimes(1);
  });

  it("shows the workflow the user selects", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({
      nodes: [canvasNode("old-node", "Old")],
    });
    getWorkflowMock.mockResolvedValue(
      savedDocument("Other pipeline", {
        workflowId: "workflow-2",
        nodes: [storedNode("loaded-node", "Loaded")],
      }),
    );

    await useWorkflowStore.getState().selectWorkflow("workflow-2");

    expect(getWorkflowMock).toHaveBeenCalledWith("workflow-2");
    expect(useWorkflowStore.getState().activeWorkflowId).toBe("workflow-2");
    expect(useWorkflowStore.getState().workflowName).toBe("Other pipeline");
    expect(useWorkflowStore.getState().nodes.map((node) => node.id)).toEqual([
      "loaded-node",
    ]);
    expect(useWorkflowStore.getState().nodes[0]?.data.label).toBe("Loaded");
  });

  it("does not fetch the workflow that is already open", async () => {
    openSavedWorkflow();

    await useWorkflowStore.getState().selectWorkflow("workflow-1");

    expect(getWorkflowMock).not.toHaveBeenCalled();
  });

  it("clears the canvas when the selected workflow is missing", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({ nodes: [canvasNode("old-node", "Old")] });
    getWorkflowMock.mockRejectedValue(
      axiosResponse(404, { detail: "Workflow not found" }),
    );

    await useWorkflowStore.getState().selectWorkflow("workflow-2");

    expect(useWorkflowStore.getState().requestState).toBe("notFound");
    expect(useWorkflowStore.getState().activeWorkflowId).toBeNull();
    expect(useWorkflowStore.getState().nodes).toEqual([]);
  });

  it("opens a workflow created with the name the user typed", async () => {
    openSavedWorkflow();
    createWorkflowMock.mockResolvedValue(
      savedDocument("Nightly train", { workflowId: "workflow-2" }),
    );

    await useWorkflowStore.getState().createEmptyWorkflow("  Nightly train  ");

    expect(createWorkflowMock).toHaveBeenCalledWith({
      name: "Nightly train",
      nodes: [],
      edges: [],
    });
    expect(useWorkflowStore.getState().activeWorkflowId).toBe("workflow-2");
    expect(useWorkflowStore.getState().workflowName).toBe("Nightly train");
  });

  it("opens the remaining workflow after a delete", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({
      workflows: [
        { id: "workflow-1", name: "Pipeline", status: "valid" },
        { id: "workflow-2", name: "Other pipeline", status: "valid" },
      ],
    });
    deleteWorkflowMock.mockResolvedValue();
    getWorkflowMock.mockResolvedValue(
      savedDocument("Other pipeline", { workflowId: "workflow-2" }),
    );

    await useWorkflowStore.getState().deleteActiveWorkflow();

    expect(deleteWorkflowMock).toHaveBeenCalledWith("workflow-1");
    expect(useWorkflowStore.getState().activeWorkflowId).toBe("workflow-2");
    expect(useWorkflowStore.getState().workflows.map((summary) => summary.id)).toEqual([
      "workflow-2",
    ]);
  });

  it("creates a workflow after the last one is deleted", async () => {
    openSavedWorkflow();
    deleteWorkflowMock.mockResolvedValue();
    createWorkflowMock.mockResolvedValue(
      savedDocument("Untitled workflow", { workflowId: "workflow-new" }),
    );

    await useWorkflowStore.getState().deleteActiveWorkflow();

    expect(deleteWorkflowMock).toHaveBeenCalledWith("workflow-1");
    expect(createWorkflowMock).toHaveBeenCalled();
    expect(useWorkflowStore.getState().activeWorkflowId).toBe("workflow-new");
  });

  it("saves a new node", async () => {
    openSavedWorkflow();
    updateWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

    useWorkflowStore.getState().addNode("DataSource", "Load dataset", {
      dataset: "Customers",
    });

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("saved");
    });
    expect(useWorkflowStore.getState().nodes).toHaveLength(1);
    expect(useWorkflowStore.getState().nodes[0]?.data.label).toBe("Load dataset");
    expect(updateWorkflowMock).toHaveBeenCalledWith(
      "workflow-1",
      expect.objectContaining({
        nodes: [
          expect.objectContaining({
            data: expect.objectContaining({ label: "Load dataset" }),
          }),
        ],
      }),
    );
  });

  it("does not save a blank node title", async () => {
    openSavedWorkflow();

    useWorkflowStore.getState().addNode("DataSource", "   ", {});
    await Promise.resolve();

    expect(useWorkflowStore.getState().nodes).toEqual([]);
    expect(updateWorkflowMock).not.toHaveBeenCalled();
  });

  it("saves a renamed node", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({ nodes: [canvasNode("source-node", "Load")] });
    updateWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

    useWorkflowStore.getState().updateNodeDetails("source-node", "Customers", {
      dataset: "Customers",
    });

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("saved");
    });
    expect(useWorkflowStore.getState().nodes[0]?.data.label).toBe("Customers");
    expect(useWorkflowStore.getState().nodes[0]?.data.outputs[0]?.label).toBe(
      "Customers",
    );
  });

  it("removes a node and its connections", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({
      nodes: [canvasNode("source-node", "Load"), canvasNode("transform-node", "Clean")],
      edges: [canvasEdge("edge-1", "source-node", "transform-node")],
    });
    updateWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

    useWorkflowStore.getState().deleteNode("source-node");

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("saved");
    });
    expect(useWorkflowStore.getState().nodes.map((node) => node.id)).toEqual([
      "transform-node",
    ]);
    expect(useWorkflowStore.getState().edges).toEqual([]);
    expect(updateWorkflowMock).toHaveBeenCalledWith(
      "workflow-1",
      expect.objectContaining({ edges: [] }),
    );
  });

  it("saves a new connection", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({
      nodes: [canvasNode("source-node", "Load"), canvasNode("transform-node", "Clean")],
    });
    updateWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

    useWorkflowStore.getState().connecHandles({
      source: "source-node",
      target: "transform-node",
      sourceHandle: "dataset",
      targetHandle: "dataset",
    });

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().edges).toHaveLength(1);
    });
    expect(updateWorkflowMock).toHaveBeenCalledWith(
      "workflow-1",
      expect.objectContaining({
        edges: [
          expect.objectContaining({
            sourceNodeId: "source-node",
            targetNodeId: "transform-node",
            sourceHandleId: "dataset",
            targetHandleId: "dataset",
          }),
        ],
      }),
    );
  });

  it("saves a deleted connection", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({
      edges: [canvasEdge("edge-1", "source-node", "transform-node")],
    });
    updateWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

    useWorkflowStore.getState().deleteEdge("edge-1");

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().edges).toEqual([]);
    });
    expect(updateWorkflowMock).toHaveBeenCalled();
  });

  it("does not save when a connection is only selected", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({
      edges: [canvasEdge("edge-1", "source-node", "transform-node")],
    });

    useWorkflowStore.getState().applyCanvasEdgeChanges([
      { type: "select", id: "edge-1", selected: true },
    ]);
    await Promise.resolve();

    expect(useWorkflowStore.getState().edges).toHaveLength(1);
    expect(updateWorkflowMock).not.toHaveBeenCalled();
  });

  it("does not save a blank workflow name", async () => {
    openSavedWorkflow();

    useWorkflowStore.getState().renameWorkflow("   ");
    await Promise.resolve();

    expect(useWorkflowStore.getState().workflowName).toBe("   ");
    expect(updateWorkflowMock).not.toHaveBeenCalled();
  });

  it("keeps the canvas nodes when the save response has none", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({ nodes: [canvasNode("source-node", "Load")] });
    updateWorkflowMock.mockResolvedValue(savedDocument("Renamed"));

    useWorkflowStore.getState().renameWorkflow("Renamed");

    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("saved");
    });
    expect(useWorkflowStore.getState().workflowName).toBe("Renamed");
    expect(useWorkflowStore.getState().nodes.map((node) => node.id)).toEqual([
      "source-node",
    ]);
  });

  it("ignores a save response that is older than a later edit", async () => {
    openSavedWorkflow();
    let resolveFirstSave: (workflowDocument: ReturnType<typeof savedDocument>) => void =
      () => undefined;
    let resolveSecondSave: (workflowDocument: ReturnType<typeof savedDocument>) => void =
      () => undefined;
    updateWorkflowMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstSave = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondSave = resolve;
          }),
      );

    useWorkflowStore.getState().renameWorkflow("First edit");
    await vi.waitFor(() => {
      expect(updateWorkflowMock).toHaveBeenCalledTimes(1);
    });

    useWorkflowStore.getState().renameWorkflow("Second edit");
    resolveFirstSave(savedDocument("Stale name"));

    await vi.waitFor(() => {
      expect(updateWorkflowMock).toHaveBeenCalledTimes(2);
    });
    expect(useWorkflowStore.getState().workflowName).toBe("Second edit");

    resolveSecondSave(savedDocument("Second edit"));
    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("saved");
    });
    expect(useWorkflowStore.getState().workflowName).toBe("Second edit");
  });

  it("saves the next edit after a save fails", async () => {
    openSavedWorkflow();
    updateWorkflowMock
      .mockRejectedValueOnce(new AxiosError("offline"))
      .mockResolvedValueOnce(savedDocument("Recovered"));

    useWorkflowStore.getState().renameWorkflow("Offline");
    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("networkError");
    });

    useWorkflowStore.getState().renameWorkflow("Recovered");
    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("saved");
    });
    expect(useWorkflowStore.getState().workflowName).toBe("Recovered");
    expect(updateWorkflowMock).toHaveBeenCalledTimes(2);
  });

  it("retries a failed save", async () => {
    openSavedWorkflow();
    updateWorkflowMock
      .mockRejectedValueOnce(new AxiosError("offline"))
      .mockResolvedValueOnce(savedDocument("Pipeline"));

    useWorkflowStore.getState().renameWorkflow("Pipeline");
    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("networkError");
    });

    useWorkflowStore.getState().retrySave();
    await vi.waitFor(() => {
      expect(useWorkflowStore.getState().requestState).toBe("saved");
    });
    expect(updateWorkflowMock).toHaveBeenCalledTimes(2);
    expect(useWorkflowStore.getState().saveFailureDialogIsOpen).toBe(false);
  });

  it("saves a node when its drag ends", async () => {
    openSavedWorkflow();
    useWorkflowStore.setState({ nodes: [canvasNode("source-node", "Load")] });
    updateWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

    useWorkflowStore.getState().applyCanvasNodeChanges([
      {
        type: "position",
        id: "source-node",
        position: { x: 30, y: 40 },
        dragging: true,
      },
    ]);
    expect(updateWorkflowMock).not.toHaveBeenCalled();

    useWorkflowStore.getState().applyCanvasNodeChanges([
      {
        type: "position",
        id: "source-node",
        position: { x: 30, y: 40 },
        dragging: false,
      },
    ]);

    await vi.waitFor(() => {
      expect(updateWorkflowMock).toHaveBeenCalledWith(
        "workflow-1",
        expect.objectContaining({
          nodes: [
            expect.objectContaining({
              position: { x: 30, y: 40 },
            }),
          ],
        }),
      );
    });
  });

  it("saves a node that has been dragged for a while", async () => {
    vi.useFakeTimers();
    try {
      openSavedWorkflow();
      useWorkflowStore.setState({ nodes: [canvasNode("source-node", "Load")] });
      updateWorkflowMock.mockResolvedValue(savedDocument("Pipeline"));

      useWorkflowStore.getState().applyCanvasNodeChanges([
        {
          type: "position",
          id: "source-node",
          position: { x: 30, y: 40 },
          dragging: true,
        },
      ]);
      await vi.advanceTimersByTimeAsync(399);
      expect(updateWorkflowMock).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(updateWorkflowMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
