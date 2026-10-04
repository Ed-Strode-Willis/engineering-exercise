import type { NodeType } from "@/types/workflow";

export function NodeTypeHeading({ nodeType }: { nodeType: NodeType }) {
  return (
    <p className={nodeTypeHeaderClass(nodeType)}>{nodeType}</p>
  );
}

function nodeTypeHeaderClass(nodeType: NodeType): string {
  const headingClass =
    "rounded-t-[7px] border-b pt-3 pr-14 pb-2 pl-6 text-[11px] font-medium tracking-wide uppercase";
  if (nodeType === "DataSource") return `${headingClass} border-blue-100 bg-blue-50 text-blue-700`;
  if (nodeType === "Transform") return `${headingClass} border-violet-100 bg-violet-50 text-violet-700`;
  return `${headingClass} border-teal-100 bg-teal-50 text-teal-700`;
}
