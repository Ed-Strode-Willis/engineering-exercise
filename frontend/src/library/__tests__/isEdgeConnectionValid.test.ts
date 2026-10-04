import { describe, expect, it } from "vitest";

import type { HandleDefinition } from "@/types/workflow";

import type { FlowEdge, FlowNode } from "../../types/flowTypes";
import { isEdgeConnectionValid } from "../isEdgeConnectionValid";

const datasetOutput: HandleDefinition = {
  id: "dataset",
  label: "Raw rows",
  type: "Dataset",
  required: true,
};

const datasetInput: HandleDefinition = {
  id: "dataset",
  label: "Dataset",
  type: "Dataset",
  required: true,
};

const modelOutput: HandleDefinition = {
  id: "model",
  label: "Trained model",
  type: "Model",
  required: false,
};

const loadDataset = flowNode("datasource-1", "Load Dataset", [], [datasetOutput]);
const transformDataset = flowNode("transform-1", "Transform Dataset", [datasetInput], [
  datasetOutput,
]);
const trainModel = flowNode("model-1", "Train Model", [datasetInput], [modelOutput]);

describe("isEdgeConnectionValid", () => {
  it("allows a Dataset output to feed a Dataset input", () => {
    const decision = isEdgeConnectionValid(
      {
        sourceNodeId: "datasource-1",
        sourceHandleId: "dataset",
        targetNodeId: "transform-1",
        targetHandleId: "dataset",
      },
      [loadDataset, transformDataset],
      [],
    );

    expect(decision.connectionIsValid).toBe(true);
    expect(decision.refusalMessage).toBe("");
  });

  it("refuses a node connected to itself", () => {
    const decision = isEdgeConnectionValid(
      {
        sourceNodeId: "transform-1",
        sourceHandleId: "dataset",
        targetNodeId: "transform-1",
        targetHandleId: "dataset",
      },
      [transformDataset],
      [],
    );

    expect(decision.connectionIsValid).toBe(false);
    expect(decision.refusalMessage).toBe("This connection creates a loop.");
  });

  it("refuses a connection that would close a loop", () => {
    const secondTransform = flowNode(
      "transform-2",
      "Second transform",
      [datasetInput],
      [datasetOutput],
    );
    const existingConnection: FlowEdge = {
      id: "edge-1",
      source: "transform-1",
      target: "transform-2",
      sourceHandle: "dataset",
      targetHandle: "dataset",
    };

    const decision = isEdgeConnectionValid(
      {
        sourceNodeId: "transform-2",
        sourceHandleId: "dataset",
        targetNodeId: "transform-1",
        targetHandleId: "dataset",
      },
      [transformDataset, secondTransform],
      [existingConnection],
    );

    expect(decision.connectionIsValid).toBe(false);
    expect(decision.refusalMessage).toBe("This connection creates a loop.");
  });

  it("allows a connection that continues a pipeline", () => {
    const existingConnection: FlowEdge = {
      id: "edge-1",
      source: "datasource-1",
      target: "transform-1",
      sourceHandle: "dataset",
      targetHandle: "dataset",
    };

    const decision = isEdgeConnectionValid(
      {
        sourceNodeId: "transform-1",
        sourceHandleId: "dataset",
        targetNodeId: "model-1",
        targetHandleId: "dataset",
      },
      [loadDataset, transformDataset, trainModel],
      [existingConnection],
    );

    expect(decision.connectionIsValid).toBe(true);
    expect(decision.refusalMessage).toBe("");
  });

  it("refuses a Model output connected to a Dataset input", () => {
    const decision = isEdgeConnectionValid(
      {
        sourceNodeId: "model-1",
        sourceHandleId: "model",
        targetNodeId: "transform-1",
        targetHandleId: "dataset",
      },
      [trainModel, transformDataset],
      [],
    );

    expect(decision.connectionIsValid).toBe(false);
    expect(decision.refusalMessage).toBe(
      "A Model output is incompatible with a Dataset input.",
    );
  });

  it("refuses an output when the input already has a connection", () => {
    const existingConnection: FlowEdge = {
      id: "edge-1",
      source: "datasource-1",
      target: "transform-1",
      sourceHandle: "dataset",
      targetHandle: "dataset",
    };
    const secondSource = flowNode("datasource-2", "Spare source", [], [datasetOutput]);

    const decision = isEdgeConnectionValid(
      {
        sourceNodeId: "datasource-2",
        sourceHandleId: "dataset",
        targetNodeId: "transform-1",
        targetHandleId: "dataset",
      },
      [loadDataset, secondSource, transformDataset],
      [existingConnection],
    );

    expect(decision.connectionIsValid).toBe(false);
    expect(decision.refusalMessage).toBe(
      "A Dataset input can only have one connection.",
    );
  });
});

function flowNode(
  nodeId: string,
  label: string,
  inputs: HandleDefinition[],
  outputs: HandleDefinition[],
): FlowNode {
  return {
    id: nodeId,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: { label, nodeType: "DataSource", inputs, outputs },
  };
}
