import { CloseIcon } from "./ToolbarIcons";
import { useWorkflowStore } from "@store/workflowStore";

export function DeleteNodeButton({ nodeId }: { nodeId: string }) {
  const deleteWorkflowNode = useWorkflowStore((state) => state.deleteNode);

  return (
    <button
      type="button"
      className="nodrag nopan inline-flex size-5 items-center justify-center rounded-full text-neutral-500 hover:bg-red-50 hover:text-red-700"
      aria-label="Delete node"
      tabIndex={-1}
      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
      onClick={() => deleteWorkflowNode(nodeId)}
    >
      <CloseIcon />
    </button>
  );
}
