import { MiniMap, Panel } from "@xyflow/react";
import { useState } from "react";

const minimapWidth = 180;
const minimapHeight = 120;

export function CanvasMinimap() {
  const [minimapIsOpen, setMinimapIsOpen] = useState(true);

  if (!minimapIsOpen) {
    return (
      <Panel position="bottom-right">
        <button
          type="button"
          className="flex size-[22px] cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white p-0 leading-none text-neutral-600 shadow-sm hover:text-neutral-900"
          aria-label="Show minimap"
          aria-expanded={false}
          onClick={() => setMinimapIsOpen(true)}
        >
          <MinimapIcon />
        </button>
      </Panel>
    );
  }

  return (
    <>
      <MiniMap
        className="!overflow-hidden !rounded-lg !border !border-neutral-200 !shadow-sm"
        style={{ width: minimapWidth, height: minimapHeight }}
        pannable
        zoomable
        bgColor="#ffffff"
        maskColor="rgb(245 245 245 / 0.72)"
        nodeColor="#e5e5e5"
        nodeStrokeColor="#a3a3a3"
        nodeStrokeWidth={1}
        nodeBorderRadius={2}
      />
      <Panel
        position="bottom-right"
        className="!pointer-events-none !border-0 !bg-transparent !shadow-none"
        style={{ width: minimapWidth, height: minimapHeight }}
      >
        <button
          type="button"
          className="pointer-events-auto absolute top-1.5 right-1.5 flex size-[22px] cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white p-0 leading-none text-neutral-600 shadow-sm hover:text-neutral-900"
          aria-label="Hide minimap"
          aria-expanded={true}
          onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            setMinimapIsOpen(false);
          }}
        >
          <CollapseIcon />
        </button>
      </Panel>
    </>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="block h-3 w-3">
      <path
        d="M4 8h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MinimapIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect x="8" y="8" width="4.5" height="4.5" rx="0.5" fill="currentColor" />
    </svg>
  );
}
