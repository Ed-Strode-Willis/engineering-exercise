import { useState } from "react";

import { useWorkflowStore } from "@store/workflowStore";
import { workflowNameIssue } from "@library/documentText";
import { EditorDialog } from "./EditorDialog";

export function CreateWorkflowDialog({ onClose }: { onClose: () => void }) {
  const createEmptyWorkflow = useWorkflowStore((state) => state.createEmptyWorkflow);
  const [draftName, setDraftName] = useState("");
  const [nameError, setNameError] = useState("");

  function createNamedWorkflow() {
    const nameIssue = workflowNameIssue(draftName);
    if (nameIssue) {
      setNameError(nameIssue);
      return;
    }
    void createEmptyWorkflow(draftName);
    onClose();
  }

  return (
    <EditorDialog title="New workflow" onClose={onClose}>
      <form
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          createNamedWorkflow();
        }}
      >
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
        {nameError ? <p className="mt-2 text-sm text-red-700">{nameError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-md px-3 py-[0.45rem] text-sm text-neutral-700 hover:bg-neutral-100" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-neutral-900 px-3 py-[0.45rem] text-sm text-white">
            Create
          </button>
        </div>
      </form>
    </EditorDialog>
  );
}
