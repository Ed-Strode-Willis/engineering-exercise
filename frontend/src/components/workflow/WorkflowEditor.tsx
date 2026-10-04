import { useEffect } from "react";

import { SaveFailureDialog } from "./SaveFailureDialog";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { useWorkflowStore } from "@store/workflowStore";

export function WorkflowEditor() {
  const loadWorkflowList = useWorkflowStore((state) => state.loadWorkflowList);

  useEffect(() => {
    void loadWorkflowList();
  }, [loadWorkflowList]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-100">
      <WorkflowToolbar />
      <div className="relative min-h-0 flex-1 p-3">
        <WorkflowCanvas />
      </div>
      <SaveFailureDialog />
    </div>
  );
}
