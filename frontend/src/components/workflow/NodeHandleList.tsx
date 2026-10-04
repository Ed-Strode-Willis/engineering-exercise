import { Handle, Position } from "@xyflow/react";

import type { HandleDefinition } from "@/types/workflow";

import { labelForConnectedInput } from "@library/labelForConnectedInput";
import { useWorkflowStore } from "@store/workflowStore";
import { ClippedLabel } from "./ClippedLabel";

export function NodeHandleList({
  nodeId,
  inputs,
  outputs,
}: {
  nodeId: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
}) {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);

  return (
    <div className="flex w-full min-w-0 justify-between gap-6 px-5 py-3 text-xs text-neutral-600">
      <ul className="min-w-0 flex-1">
        {inputs.map((handle, handleIndex) => (
          <NodeInputHandle
            key={handle.id}
            handle={handle}
            displayLabel={labelForConnectedInput(handle, nodeId, nodes, edges)}
            handleIndex={handleIndex}
            handleCount={inputs.length}
          />
        ))}
      </ul>
      <ul className="min-w-0 flex-1 text-right">
        {outputs.map((handle, handleIndex) => (
          <NodeOutputHandle
            key={handle.id}
            handle={handle}
            handleIndex={handleIndex}
            handleCount={outputs.length}
          />
        ))}
      </ul>
    </div>
  );
}

function NodeInputHandle({
  handle,
  displayLabel,
  handleIndex,
  handleCount,
}: {
  handle: HandleDefinition;
  displayLabel: string;
  handleIndex: number;
  handleCount: number;
}) {
  return (
    <li className="relative min-w-0 py-2 pl-3">
      <Handle
        id={handle.id}
        type="target"
        position={Position.Left}
        className="!size-2 !rounded-full !border-0 !bg-neutral-900"
        aria-label={`${handle.type} ${displayLabel} input`}
        style={handleStyle(handleIndex, handleCount)}
      />
      <HandleCaption
        label={displayLabel}
        handleType={handle.type}
        align="left"
      />
    </li>
  );
}

function NodeOutputHandle({
  handle,
  handleIndex,
  handleCount,
}: {
  handle: HandleDefinition;
  handleIndex: number;
  handleCount: number;
}) {
  return (
    <li className="relative min-w-0 py-2 pr-3">
      <Handle
        id={handle.id}
        type="source"
        position={Position.Right}
        className="!size-2 !rounded-full !border-0 !bg-neutral-900"
        aria-label={`${handle.type} ${handle.label} output`}
        style={handleStyle(handleIndex, handleCount)}
      />
      <HandleCaption
        label={handle.label}
        handleType={handle.type}
        align="right"
      />
    </li>
  );
}

function HandleCaption({
  label,
  handleType,
  align,
}: {
  label: string;
  handleType: HandleDefinition["type"];
  align: "left" | "right";
}) {
  const alignmentClass = align === "right" ? "text-right" : "text-left";
  const labelClass =
    align === "right"
      ? "ml-auto block w-max max-w-full truncate text-left text-neutral-800"
      : "block w-max max-w-full truncate text-left text-neutral-800";
  return (
    <span className={`flex w-full min-w-0 flex-col ${alignmentClass}`}>
      <span className="text-[10px] tracking-wide text-neutral-400 uppercase">
        {handleType}
      </span>
      <ClippedLabel text={label} className={labelClass} align={align} />
    </span>
  );
}

function handleStyle(handleIndex: number, handleCount: number) {
  return { top: `${((handleIndex + 1) / (handleCount + 1)) * 100}%` };
}
