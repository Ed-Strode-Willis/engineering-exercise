import { useState } from "react";

import { useWorkflowStore } from "@store/workflowStore";
import { workflowNameIssue } from "@library/documentText";
import { EditorDialog } from "./EditorDialog";
import { PencilIcon } from "./ToolbarIcons";
import { ToolbarIconButton } from "./ToolbarIconButton";

export function EditWorkflowDialog() {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const activeWorkflowId = useWorkflowStore((state) => state.activeWorkflowId);
  const requestState = useWorkflowStore((state) => state.requestState);
  const renameWorkflow = useWorkflowStore((state) => state.renameWorkflow);
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const [draftName, setDraftName] = useState(workflowName);
  const [nameError, setNameError] = useState("");
  const editIsDisabled =
    !activeWorkflowId || requestState === "loading" || requestState === "notFound";

  function openDialog() {
    setDraftName(workflowName);
    setNameError("");
    setDialogIsOpen(true);
  }

  function closeDialog() {
    setDialogIsOpen(false);
    setNameError("");
  }

  function saveName() {
    const nameIssue = workflowNameIssue(draftName);
    if (nameIssue) {
      setNameError(nameIssue);
      return;
    }
    renameWorkflow(draftName);
    closeDialog();
  }

  return (
    <>
      <ToolbarIconButton
        label="Edit workflow"
        disabled={editIsDisabled}
        onClick={openDialog}
      >
        <PencilIcon />
      </ToolbarIconButton>
      {dialogIsOpen ? (
        <EditorDialog title="Edit workflow" onClose={closeDialog}>
          <label className="block text-sm font-medium">
            Name
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-sm"
              value={draftName}
              autoFocus
              onChange={(changeEvent) => {
                setDraftName(changeEvent.target.value);
                setNameError("");
              }}
            />
          </label>
          {nameError ? (
            <p className="mt-2 text-sm text-red-700">{nameError}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-md px-3 py-[0.45rem] text-sm text-neutral-700 hover:bg-neutral-100" onClick={closeDialog}>
              Cancel
            </button>
            <button type="button" className="rounded-md bg-neutral-900 px-3 py-[0.45rem] text-sm text-white" onClick={saveName}>
              Save name
            </button>
          </div>
        </EditorDialog>
      ) : null}
    </>
  );
}
