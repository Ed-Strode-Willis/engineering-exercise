import { createPortal } from "react-dom";

import { useWorkflowStore } from "@store/workflowStore";

export function SaveFailureDialog() {
  const saveFailureDialogIsOpen = useWorkflowStore(
    (state) => state.saveFailureDialogIsOpen,
  );
  const requestState = useWorkflowStore((state) => state.requestState);
  const retrySave = useWorkflowStore((state) => state.retrySave);
  if (!saveFailureDialogIsOpen) return null;

  const saveIsInProgress = requestState === "saving";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Could not save"
        className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-lg"
      >
        <h2 className="text-base font-medium">Could not save</h2>
        <p className="mt-3 text-sm leading-snug text-neutral-600">
          The workflow could not be saved to the server. If this keeps happening,
          contact us.
        </p>
        <button
          type="button"
          className="mt-4 rounded-md bg-neutral-900 px-3 py-[0.45rem] text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={saveIsInProgress}
          onClick={retrySave}
        >
          {saveIsInProgress ? "Saving" : "Retry"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
