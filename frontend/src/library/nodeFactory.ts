import type { NodeType } from "@/types/workflow";

import type { FlowNode } from "../types/flowTypes";
import { NODE_DEFINITIONS } from "@library/nodeDefinitions";

const clone = <T>(value: T): T => structuredClone(value);

interface CreateFlowNodeArgs {
  nodeType: NodeType;
  position: FlowNode["position"];
  label?: string;
  outputLabels?: Record<string, string>;
  id?: string;
}

/** Build a correctly-shaped ReactFlow node for the given node type. */
export function createFlowNode({
  nodeType,
  position,
  label,
  outputLabels = {},
  id = crypto.randomUUID(),
}: CreateFlowNodeArgs): FlowNode {
  const definition = NODE_DEFINITIONS[nodeType];

  return {
    id,
    type: "workflowNode",
    position,
    data: {
      label: label ?? nodeType,
      nodeType,
      inputs: clone(definition.inputs),
      outputs: applyOutputLabels(clone(definition.outputs), outputLabels),
    },
  };
}

export function nodeWithUpdatedDetails(
  node: FlowNode,
  nodeLabel: string,
  outputLabels: Record<string, string>,
): FlowNode {
  return {
    ...node,
    data: {
      ...node.data,
      label: nodeLabel,
      outputs: applyOutputLabels(node.data.outputs, outputLabels),
    },
  };
}

function applyOutputLabels(
  outputs: FlowNode["data"]["outputs"],
  outputLabels: Record<string, string>,
): FlowNode["data"]["outputs"] {
  return outputs.map((output) => {
    const outputLabel = outputLabels[output.id]?.trim();
    if (!outputLabel) return output;
    return { ...output, label: outputLabel };
  });
}
