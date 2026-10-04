import { type ReactNode } from "react";
import { createPortal } from "react-dom";

export function EditorDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-lg"
        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      >
        <h2 className="text-base font-medium">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
