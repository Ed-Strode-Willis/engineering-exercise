import {
  handleDefinitionSchema,
  workflowNodeDataSchema,
  workflowWriteSchema,
} from "@/validation/generatedWorkflowSchema";

/** The name, title, and label rules the backend publishes, as generated Zod. */

export function workflowNameIssue(workflowName: string): string | null {
  if (workflowWriteSchema.shape.name.safeParse(workflowName).success) return null;
  return "A workflow needs a name.";
}

export function nodeTitleIssue(nodeTitle: string): string | null {
  if (workflowNodeDataSchema.shape.label.safeParse(nodeTitle).success) return null;
  return "A node needs a title.";
}

export function outputLabelIssue(
  outputs: { id: string }[],
  outputLabels: Record<string, string>,
): string | null {
  const everyOutputHasALabel = outputs.every((output) =>
    handleDefinitionSchema.shape.label.safeParse(outputLabels[output.id] ?? "").success,
  );
  if (everyOutputHasALabel) return null;
  return "An output needs a label.";
}
