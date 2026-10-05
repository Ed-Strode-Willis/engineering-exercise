import { useWorkflowStore, type EditorRequestState } from "@store/workflowStore";
import { AddNodeDialog } from "./AddNodeDialog";
import { DeleteWorkflowButton } from "./DeleteWorkflowButton";
import { EditWorkflowDialog } from "./EditWorkflowDialog";
import { SaveStatus } from "./SaveStatus";
import { ValidationMark } from "./ValidationMark";
import { WorkflowMenu } from "./WorkflowMenu";

export function WorkflowToolbar() {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const requestState = useWorkflowStore((state) => state.requestState);

  return (
    <header className="relative z-20 flex items-center gap-1 border-b border-neutral-200 bg-white px-2 py-1">
      <WorkflowMenu />
      <p className="min-w-0 shrink truncate text-sm font-medium pr-2">
        {workflowTitle(workflowName, requestState)}
      </p>
      <SaveStatus />
      <ValidationMark />
      <div className="min-w-2 flex-1" />
      <AddNodeDialog />
      <EditWorkflowDialog />
      <DeleteWorkflowButton />
    </header>
  );
}

function workflowTitle(workflowName: string, requestState: EditorRequestState): string {
  if (requestState === "notFound") return "Missing workflow";
  if (serverIsUnavailableAndNoWorkflowIsOpen(workflowName, requestState)) {
    return "Server unavailable";
  }
  return workflowName || "Workflow";
}

function serverIsUnavailableAndNoWorkflowIsOpen(
  workflowName: string,
  requestState: EditorRequestState,
): boolean {
  return requestState === "networkError" && workflowName.trim().length === 0;
}
