import type { HandleDefinition } from "@/types/workflow";

export function OutputLabelFields({
  outputs,
  outputLabels,
  onOutputLabelChange,
}: {
  outputs: HandleDefinition[];
  outputLabels: Record<string, string>;
  onOutputLabelChange: (handleId: string, outputLabel: string) => void;
}) {
  return outputs.map((output) => (
    <label key={output.id} className="mt-3 block text-sm font-medium">
      {output.type} output
      <input
        className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-sm"
        value={outputLabels[output.id] ?? ""}
        aria-label={`${output.type} output label`}
        onChange={(changeEvent) =>
          onOutputLabelChange(output.id, changeEvent.target.value)
        }
      />
    </label>
  ));
}
