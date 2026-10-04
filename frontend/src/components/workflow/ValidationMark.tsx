import type { ValidationIssue, ValidationResult } from "@/types/workflow";

import { useWorkflowStore } from "@store/workflowStore";
import { ExclamationIcon, TickIcon } from "./ToolbarIcons";

/** Shows the validation the server returned with the last save or load. */
export function ValidationMark() {
  const validation = useWorkflowStore((state) => state.validation);
  if (!validation) return null;
  if (validation.valid) return <PassedMark />;
  return <IssueMark validation={validation} />;
}

function PassedMark() {
  return (
    <span className="group relative inline-flex" tabIndex={0}>
      <span className="text-emerald-600">
        <TickIcon />
      </span>
      <span className={validationTooltipClass} role="tooltip">
        Workflow valid
      </span>
    </span>
  );
}

function IssueMark({ validation }: { validation: ValidationResult }) {
  const errors = validation.errors ?? [];
  const warnings = validation.warnings ?? [];
  const hasErrors = errors.length > 0;
  const issueCount = hasErrors ? errors.length : warnings.length;

  return (
    <span
      className="group relative inline-flex text-neutral-700"
      tabIndex={0}
      aria-label={issueCountLabel(errors.length, warnings.length)}
    >
      <span className="relative">
        <ExclamationIcon />
        <span className={validationCountClass(hasErrors ? "error" : "warning")}>
          {issueCount}
        </span>
      </span>
      <IssuePanel errors={errors} warnings={warnings} />
    </span>
  );
}

function IssuePanel({
  errors,
  warnings,
}: {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}) {
  return (
    <span className={validationTooltipClass} role="tooltip">
      <ul className="flex flex-col gap-[0.35rem] text-neutral-900">
        {errors.map((issue, issueIndex) => (
          <IssueRow key={`error-${issue.code}-${issueIndex}`} issue={issue} tone="error" />
        ))}
        {warnings.map((issue, issueIndex) => (
          <IssueRow
            key={`warning-${issue.code}-${issueIndex}`}
            issue={issue}
            tone="warning"
          />
        ))}
      </ul>
    </span>
  );
}

function IssueRow({ issue, tone }: { issue: ValidationIssue; tone: "error" | "warning" }) {
  return (
    <li className="flex gap-[0.45rem]">
      <span className={validationIssueBarClass(tone)} />
      <span>{issue.message}</span>
    </li>
  );
}

const validationTooltipClass =
  "absolute top-[calc(100%+6px)] left-0 z-30 hidden w-max max-w-80 flex-col gap-[0.4rem] rounded-lg border border-neutral-200 bg-white px-[0.7rem] py-2 text-xs leading-[1.35] text-neutral-900 shadow-sm group-hover:flex group-focus-within:flex";

function validationCountClass(tone: "error" | "warning"): string {
  const countClass =
    "absolute -right-1.5 -bottom-1 inline-flex h-[13px] min-w-[13px] items-center justify-center rounded-full border-[1.5px] border-white px-0.5 text-[8px] leading-none font-bold";
  if (tone === "error") return `${countClass} bg-red-600 text-white`;
  return `${countClass} bg-yellow-400 text-yellow-950`;
}

function validationIssueBarClass(tone: "error" | "warning"): string {
  const barClass = "w-[3px] shrink-0 rounded-full";
  if (tone === "error") return `${barClass} bg-red-600`;
  return `${barClass} bg-yellow-400`;
}

function issueCountLabel(errorCount: number, warningCount: number): string {
  return `${countPhrase(errorCount, "error")}, ${countPhrase(warningCount, "warning")}`;
}

function countPhrase(count: number, noun: string): string {
  if (count === 1) return `1 ${noun}`;
  return `${count} ${noun}s`;
}
