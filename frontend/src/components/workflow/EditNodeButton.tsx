import { useState } from "react";

import { useWorkflowStore } from "@store/workflowStore";
import { EditorDialog } from "./EditorDialog";
import { nodeTitleIssue, outputLabelIssue } from "@library/documentText";
import { OutputLabelFields } from "./OutputLabelFields";

export function EditNodeButton({ nodeId }: { nodeId: string }) {
  const node = useWorkflowStore((state) =>
    state.nodes.find((candidate) => candidate.id === nodeId),
  );
  const updateWorkflowNodeDetails = useWorkflowStore(
    (state) => state.updateNodeDetails,
  );
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const [nodeTitle, setNodeTitle] = useState("");
  const [outputLabels, setOutputLabels] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  function openDialog() {
    if (!node) return;
    setNodeTitle(node.data.label);
    setOutputLabels(labelsForOutputs(node.data.outputs));
    setFormError("");
    setDialogIsOpen(true);
  }

  function saveNode() {
    if (!node) return;
    const titleIssue = nodeTitleIssue(nodeTitle);
    const labelIssue = outputLabelIssue(node.data.outputs, outputLabels);
    if (titleIssue || labelIssue) {
      setFormError(titleIssue ?? labelIssue ?? "");
      return;
    }
    updateWorkflowNodeDetails(nodeId, nodeTitle, outputLabels);
    setDialogIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="nodrag nopan inline-flex size-5 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        aria-label="Edit node"
        tabIndex={-1}
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        onClick={openDialog}
      >
        <EditNodeIcon />
      </button>
      {dialogIsOpen && node ? (
        <EditorDialog title="Edit node" onClose={() => setDialogIsOpen(false)}>
          <label className="block text-sm font-medium">
            Title
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-sm"
              value={nodeTitle}
              autoFocus
              aria-label="Node title"
              onChange={(changeEvent) => {
                setNodeTitle(changeEvent.target.value);
                setFormError("");
              }}
            />
          </label>
          <OutputLabelFields
            outputs={node.data.outputs}
            outputLabels={outputLabels}
            onOutputLabelChange={(handleId, outputLabel) => {
              setOutputLabels((currentLabels) => ({
                ...currentLabels,
                [handleId]: outputLabel,
              }));
              setFormError("");
            }}
          />
          {formError ? <p className="mt-2 text-sm text-red-700">{formError}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-[0.45rem] text-sm text-neutral-700 hover:bg-neutral-100"
              onClick={() => setDialogIsOpen(false)}
            >
              Cancel
            </button>
            <button type="button" className="rounded-md bg-neutral-900 px-3 py-[0.45rem] text-sm text-white" onClick={saveNode}>
              Save
            </button>
          </div>
        </EditorDialog>
      ) : null}
    </>
  );
}

function labelsForOutputs(
  outputs: { id: string; label: string }[],
): Record<string, string> {
  return Object.fromEntries(outputs.map((output) => [output.id, output.label]));
}

function EditNodeIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3">
      <path
        d="M2.5 13.5h2.2l7-7-2.2-2.2-7 7v2.2zM9 4.8l2.2 2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}
