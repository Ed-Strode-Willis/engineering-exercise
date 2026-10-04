import type { NodeProps } from "@xyflow/react";

import { DeleteNodeButton } from "./DeleteNodeButton";
import { EditNodeButton } from "./EditNodeButton";
import { NodeHandleList } from "./NodeHandleList";
import { NodeLabelField } from "./NodeLabelField";
import { NodeTypeHeading } from "./NodeTypeHeading";
import type { FlowNode } from "@/types/flowTypes";

export function WorkflowNode({ id, data }: NodeProps<FlowNode>) {
  return (
    <div className="group relative w-80 max-w-80 min-w-80 rounded-lg border border-neutral-200 bg-white shadow-[0_2px_8px_rgb(115_115_115/0.28)]">
      <div className="pointer-events-none absolute top-1 right-1 flex gap-0.5 opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
        <EditNodeButton nodeId={id} />
        <DeleteNodeButton nodeId={id} />
      </div>
      <NodeTypeHeading nodeType={data.nodeType} />
      <div className="px-6 py-3.5">
        <NodeLabelField label={data.label} />
      </div>
      <NodeHandleList nodeId={id} inputs={data.inputs} outputs={data.outputs} />
    </div>
  );
}
