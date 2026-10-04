import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

import { useWorkflowStore } from "@store/workflowStore";
import { CloseIcon } from "./ToolbarIcons";

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  markerStart,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const deleteButtonIsVisible = useDeleteButtonVisibility();
  const deleteWorkflowEdge = useWorkflowStore((state) => state.deleteEdge);
  const edgeStyle = deleteButtonIsVisible.isVisible
    ? { ...style, stroke: "#171717" }
    : style;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={0}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="react-flow__edge-interaction"
        onMouseEnter={deleteButtonIsVisible.reveal}
        onMouseLeave={deleteButtonIsVisible.hideSoon}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: deleteButtonIsVisible.isVisible ? "all" : "none",
          }}
          onMouseEnter={deleteButtonIsVisible.reveal}
          onMouseLeave={deleteButtonIsVisible.hideSoon}
        >
          <button
            type="button"
            className="inline-flex size-[18px] cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:border-red-200 hover:text-red-700"
            aria-label="Delete connection"
            aria-hidden={!deleteButtonIsVisible.isVisible}
            tabIndex={deleteButtonIsVisible.isVisible ? 0 : -1}
            style={{ opacity: deleteButtonIsVisible.isVisible ? 1 : 0 }}
            onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              deleteWorkflowEdge(id);
            }}
          >
            <CloseIcon />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function useDeleteButtonVisibility() {
  const [isVisible, setIsVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reveal() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setIsVisible(true);
  }

  function hideSoon() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIsVisible(false), 160);
  }

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return { isVisible, reveal, hideSoon };
}
