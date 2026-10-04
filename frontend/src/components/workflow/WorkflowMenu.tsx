import { useEffect, useRef, useState, type RefObject } from "react";

import type { WorkflowStatus } from "@/types/workflow";

import { useWorkflowStore } from "@store/workflowStore";
import { CreateWorkflowDialog } from "./CreateWorkflowDialog";
import { BurgerIcon, ExclamationIcon, TickIcon } from "./ToolbarIcons";
import { ToolbarIconButton } from "./ToolbarIconButton";

export function WorkflowMenu() {
  const workflows = useWorkflowStore((state) => state.workflows);
  const activeWorkflowId = useWorkflowStore((state) => state.activeWorkflowId);
  const selectWorkflow = useWorkflowStore((state) => state.selectWorkflow);
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [createDialogIsOpen, setCreateDialogIsOpen] = useState(false);
  const menuElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuIsOpen) return;
    return listenForClickOutsideMenu(menuElementRef, () => setMenuIsOpen(false));
  }, [menuIsOpen]);

  return (
    <div className="relative" ref={menuElementRef}>
      <ToolbarIconButton
        label="Workflows"
        onClick={() => setMenuIsOpen((isOpen) => !isOpen)}
      >
        <BurgerIcon />
      </ToolbarIconButton>
      {menuIsOpen ? (
        <div className="absolute top-full left-0 z-30 mt-2 w-72 rounded-lg border border-neutral-200 bg-white p-1 shadow-md">
          <ul>
            {workflows.map((workflow) => (
              <li key={workflow.id}>
                <button
                  type="button"
                  className={workflowMenuItemClass(workflow.id === activeWorkflowId)}
                  aria-current={workflow.id === activeWorkflowId ? "true" : undefined}
                  onClick={() => {
                    setMenuIsOpen(false);
                    void selectWorkflow(workflow.id);
                  }}
                >
                  <span className="font-medium">{workflow.name}</span>
                  <WorkflowValidityMark status={workflow.status} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100"
            onClick={() => {
              setMenuIsOpen(false);
              setCreateDialogIsOpen(true);
            }}
          >
            New workflow
          </button>
        </div>
      ) : null}
      {createDialogIsOpen ? (
        <CreateWorkflowDialog onClose={() => setCreateDialogIsOpen(false)} />
      ) : null}
    </div>
  );
}

function listenForClickOutsideMenu(
  menuElementRef: RefObject<HTMLDivElement | null>,
  closeMenu: () => void,
) {
  function closeMenuWhenPointerIsOutside(pointerEvent: PointerEvent) {
    const menuElement = menuElementRef.current;
    const pointerTarget = pointerEvent.target;
    if (!menuElement || !(pointerTarget instanceof Node)) return;
    if (menuElement.contains(pointerTarget)) return;
    closeMenu();
  }

  document.addEventListener("pointerdown", closeMenuWhenPointerIsOutside);
  return () => document.removeEventListener("pointerdown", closeMenuWhenPointerIsOutside);
}

function workflowMenuItemClass(workflowIsCurrent: boolean): string {
  const itemClass =
    "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100";
  if (!workflowIsCurrent) return itemClass;
  return `${itemClass} relative before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:bg-neutral-900 before:content-['']`;
}

function WorkflowValidityMark({ status }: { status: WorkflowStatus }) {
  if (status === "valid") {
    return (
      <span className="text-emerald-600" aria-label="Valid">
        <TickIcon />
      </span>
    );
  }
  return (
    <span className="text-amber-500" aria-label="Invalid">
      <ExclamationIcon />
    </span>
  );
}
