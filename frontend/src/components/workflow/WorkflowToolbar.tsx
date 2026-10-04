import { useWorkflowStore } from "@store/workflowStore";
import { AddNodeDialog } from "./AddNodeDialog";
import { DeleteWorkflowButton } from "./DeleteWorkflowButton";
import { EditWorkflowDialog } from "./EditWorkflowDialog";
import { SaveStatus } from "./SaveStatus";
import { ValidationMark } from "./ValidationMark";
import { WorkflowMenu } from "./WorkflowMenu";

export function WorkflowToolbar() {
  const workflowName = useWorkflowStore((state) => state.workflowName);

  return (
    <header className="relative z-20 flex items-center gap-1 border-b border-neutral-200 bg-white px-2 py-1">
      <WorkflowMenu />
      <p className="min-w-0 shrink truncate text-sm font-medium pr-2">
        {workflowName || "Workflow"}
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
