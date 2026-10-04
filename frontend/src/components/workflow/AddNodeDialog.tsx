import { useState } from "react";

import type { NodeType } from "@/types/workflow";

import { NODE_DEFINITIONS } from "@library/nodeDefinitions";
import { useWorkflowStore } from "@store/workflowStore";
import { EditorDialog } from "./EditorDialog";
import { nodeTitleIssue, outputLabelIssue } from "@library/documentText";
import { OutputLabelFields } from "./OutputLabelFields";
import { PlusIcon } from "./ToolbarIcons";
import { ToolbarIconButton } from "./ToolbarIconButton";
import { TypeChoiceList } from "./TypeChoiceList";

export function AddNodeDialog() {
  const addWorkflowNode = useWorkflowStore((state) => state.addNode);
  const activeWorkflowId = useWorkflowStore((state) => state.activeWorkflowId);
  const requestState = useWorkflowStore((state) => state.requestState);
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const [nodeType, setNodeType] = useState<NodeType>("DataSource");
  const [nodeTitle, setNodeTitle] = useState("");
  const [outputLabels, setOutputLabels] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const outputsForSelectedType = NODE_DEFINITIONS[nodeType].outputs;
  const addIsDisabled =
    !activeWorkflowId || requestState === "loading" || requestState === "notFound";

  function closeDialog() {
    setDialogIsOpen(false);
    setNodeTitle("");
    setOutputLabels({});
    setFormError("");
    setNodeType("DataSource");
  }

  function createNode() {
    const titleIssue = nodeTitleIssue(nodeTitle);
    const labelIssue = outputLabelIssue(outputsForSelectedType, outputLabels);
    if (titleIssue || labelIssue) {
      setFormError(titleIssue ?? labelIssue ?? "");
      return;
    }
    addWorkflowNode(nodeType, nodeTitle, outputLabels);
    closeDialog();
  }

  return (
    <>
      <ToolbarIconButton
        label="Add node"
        disabled={addIsDisabled}
        onClick={() => setDialogIsOpen(true)}
      >
        <PlusIcon />
      </ToolbarIconButton>
      {dialogIsOpen ? (
        <EditorDialog title="Add node" onClose={closeDialog}>
          <div className="text-sm font-medium">
            Type
            <TypeChoiceList selectedType={nodeType} onSelectType={setNodeType} />
          </div>
          <label className="mt-3 block text-sm font-medium">
            Title
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-sm"
              value={nodeTitle}
              autoFocus
              onChange={(changeEvent) => {
                setNodeTitle(changeEvent.target.value);
                setFormError("");
              }}
            />
          </label>
          <OutputLabelFields
            outputs={outputsForSelectedType}
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
            <button type="button" className="rounded-md px-3 py-[0.45rem] text-sm text-neutral-700 hover:bg-neutral-100" onClick={closeDialog}>
              Cancel
            </button>
            <button type="button" className="rounded-md bg-neutral-900 px-3 py-[0.45rem] text-sm text-white" onClick={createNode}>
              Add node
            </button>
          </div>
        </EditorDialog>
      ) : null}
    </>
  );
}
