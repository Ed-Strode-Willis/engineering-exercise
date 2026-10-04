import { useState } from "react";

import { useWorkflowStore } from "@store/workflowStore";
import { EditorDialog } from "./EditorDialog";
import { BinIcon } from "./ToolbarIcons";
import { ToolbarIconButton } from "./ToolbarIconButton";

export function DeleteWorkflowButton() {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const activeWorkflowId = useWorkflowStore((state) => state.activeWorkflowId);
  const requestState = useWorkflowStore((state) => state.requestState);
  const deleteActiveWorkflow = useWorkflowStore((state) => state.deleteActiveWorkflow);
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const deleteIsDisabled =
    !activeWorkflowId || requestState === "loading" || requestState === "notFound";
  const workflowTitle = workflowName.trim() || "this workflow";

  return (
    <>
      <ToolbarIconButton
        label="Delete workflow"
        disabled={deleteIsDisabled}
        onClick={() => setDialogIsOpen(true)}
      >
        <BinIcon />
      </ToolbarIconButton>
      {dialogIsOpen ? (
        <EditorDialog title="Delete workflow" onClose={() => setDialogIsOpen(false)}>
          <p className="text-sm leading-relaxed text-neutral-600">
            Delete {workflowTitle}? This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-[0.45rem] text-sm text-neutral-700 hover:bg-neutral-100"
              onClick={() => setDialogIsOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-red-50 px-3 py-[0.45rem] text-sm text-red-700 hover:bg-red-100"
              onClick={() => {
                setDialogIsOpen(false);
                void deleteActiveWorkflow();
              }}
            >
              Delete
            </button>
          </div>
        </EditorDialog>
      ) : null}
    </>
  );
}
