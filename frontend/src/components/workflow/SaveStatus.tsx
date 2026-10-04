import type { ReactNode } from "react";

import type { EditorRequestState } from "@store/workflowStore";
import { useWorkflowStore } from "@store/workflowStore";

const saveStatusTooltipClass =
  "absolute top-[calc(100%+6px)] left-0 z-30 hidden w-max max-w-80 flex-col gap-[0.4rem] rounded-lg border border-neutral-200 bg-white px-[0.7rem] py-2 text-xs leading-[1.35] text-neutral-900 shadow-sm group-hover:flex group-focus-within:flex";

export function SaveStatus() {
  const requestState = useWorkflowStore((state) => state.requestState);
  const label = saveStatusLabel(requestState);
  if (!label) return null;

  return (
    <span
      className="group relative inline-flex shrink-0 text-neutral-500"
      tabIndex={0}
      aria-label={label}
      role="status"
    >
      <SaveStatusIcon requestState={requestState} />
      <span className={saveStatusTooltipClass} role="tooltip">
        {label}
      </span>
    </span>
  );
}

function SaveStatusIcon({ requestState }: { requestState: EditorRequestState }) {
  if (requestState === "loading" || requestState === "saving") return <SpinnerIcon />;
  if (requestState === "saved") return <SavedIcon />;
  return <NotSavedIcon />;
}

function saveStatusLabel(requestState: EditorRequestState): string {
  switch (requestState) {
    case "loading":
      return "Loading";
    case "saving":
      return "Saving";
    case "saved":
      return "Saved";
    case "networkError":
      return "Not saved";
    case "notFound":
      return "Missing";
    case "idle":
      return "";
  }
}

function SavedIcon() {
  return (
    <SaveDiskIcon>
      <TickMark />
    </SaveDiskIcon>
  );
}

function NotSavedIcon() {
  return (
    <SaveDiskIcon>
      <CrossMark />
    </SaveDiskIcon>
  );
}

function SaveDiskIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
      <path
        d="M3.2 2.2h7.1l2.5 2.5v8.1a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M5 2.4v3.2h4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {children}
    </svg>
  );
}

function TickMark() {
  return (
    <path
      d="M4.6 9.2l1.7 1.7 3.6-3.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function CrossMark() {
  return (
    <path
      d="M5 8.2l4.2 4.2M9.2 8.2L5 12.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4 animate-[spin_700ms_linear_infinite]"
    >
      <circle
        cx="8"
        cy="8"
        r="5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.25"
      />
      <path
        d="M8 2.8a5.2 5.2 0 0 1 5.2 5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
