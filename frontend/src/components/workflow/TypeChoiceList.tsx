import type { NodeType } from "@/types/workflow";

const NODE_TYPE_CHOICES: { nodeType: NodeType; summary: string }[] = [
  { nodeType: "DataSource", summary: "Outputs a Dataset" },
  { nodeType: "Transform", summary: "Takes a Dataset and outputs a Dataset" },
  { nodeType: "Model", summary: "Takes a Dataset and outputs a Model" },
];

function typeChoiceClass(choiceIsSelected: boolean): string {
  const choiceClass =
    "flex w-full flex-col items-start gap-[0.1rem] rounded-md border bg-white px-2.5 py-2 text-left hover:bg-neutral-50";
  if (choiceIsSelected) return `${choiceClass} border-neutral-900 bg-neutral-50`;
  return `${choiceClass} border-neutral-200`;
}

export function TypeChoiceList({
  selectedType,
  onSelectType,
}: {
  selectedType: NodeType;
  onSelectType: (nodeType: NodeType) => void;
}) {
  return (
    <div className="mt-1 flex flex-col gap-1" role="listbox" aria-label="Type">
      {NODE_TYPE_CHOICES.map((choice) => (
        <button
          key={choice.nodeType}
          type="button"
          role="option"
          aria-selected={selectedType === choice.nodeType}
          className={typeChoiceClass(selectedType === choice.nodeType)}
          onClick={() => onSelectType(choice.nodeType)}
        >
          <span className="text-sm font-medium">{choice.nodeType}</span>
          <span className="text-xs text-neutral-500">{choice.summary}</span>
        </button>
      ))}
    </div>
  );
}
