import type { HandleDefinition, NodeType } from "@/types/workflow";

/**
 * The handles a new node is created with. The backend catalog is what a saved
 * node is checked against, so these have to stay the same shapes.
 */
const datasetInput: HandleDefinition = {
  id: "dataset",
  label: "Dataset",
  type: "Dataset",
  required: true,
};

const datasetOutput: HandleDefinition = {
  id: "dataset",
  label: "Dataset",
  type: "Dataset",
  required: true,
};

const modelOutput: HandleDefinition = {
  id: "model",
  label: "Model",
  type: "Model",
  required: false,
};

export const NODE_DEFINITIONS: Record<
  NodeType,
  { inputs: HandleDefinition[]; outputs: HandleDefinition[] }
> = {
  DataSource: { inputs: [], outputs: [datasetOutput] },
  Transform: { inputs: [datasetInput], outputs: [datasetOutput] },
  Model: { inputs: [datasetInput], outputs: [modelOutput] },
};
