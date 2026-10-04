import { ClippedLabel } from "./ClippedLabel";

export function NodeLabelField({ label }: { label: string }) {
  return (
    <ClippedLabel
      text={label}
      className="line-clamp-2 h-10 w-full text-sm font-medium wrap-anywhere"
      align="left"
    />
  );
}
