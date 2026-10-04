import { useRef, useState } from "react";

/** Shows the full string when the visible text is cut off. */
export function ClippedLabel({
  text,
  className,
  align,
}: {
  text: string;
  className: string;
  align: "left" | "right";
}) {
  const textElementRef = useRef<HTMLSpanElement>(null);
  const [fullTextIsShown, setFullTextIsShown] = useState(false);

  function revealFullTextWhenClipped() {
    const textElement = textElementRef.current;
    if (!textElement) return;
    setFullTextIsShown(textElementIsClipped(textElement));
  }

  return (
    <span
      className="relative block w-full min-w-0"
      onMouseEnter={revealFullTextWhenClipped}
      onMouseLeave={() => setFullTextIsShown(false)}
    >
      <span ref={textElementRef} className={className}>
        {text}
      </span>
      {fullTextIsShown ? <FullTextTooltip text={text} align={align} /> : null}
    </span>
  );
}

function FullTextTooltip({
  text,
  align,
}: {
  text: string;
  align: "left" | "right";
}) {
  const alignmentClass = align === "right" ? "right-0" : "left-0";
  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute top-full z-30 mt-1 w-max max-w-64 rounded-md border border-neutral-200 bg-white px-2 py-1 text-left text-xs font-normal wrap-anywhere whitespace-normal text-neutral-900 shadow-sm ${alignmentClass}`}
    >
      {text}
    </span>
  );
}

function textElementIsClipped(textElement: HTMLElement): boolean {
  const widthIsClipped = textElement.scrollWidth > textElement.clientWidth + 1;
  const heightIsClipped =
    textElement.scrollHeight > textElement.clientHeight + 1;
  return widthIsClipped || heightIsClipped;
}
