"use client";

// Presentational-only re-render of a series' Cover Design (built in the
// Book Editor's Cover tab — see CoverCanvas in
// app/[locale]/studio/series/[id]/book-editor/page.tsx) at thumbnail size,
// e.g. for the Studio dashboard card. Not interactive, not a screenshot —
// just the same background/blocks rules re-drawn smaller.

type ThumbBlock = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
};

type ThumbCoverDesign = {
  backgroundColor: string;
  useSeriesCover: boolean;
  blocks: ThumbBlock[];
};

// CoverCanvas stores fontSize as raw px calibrated against its own editing
// canvas, which renders at up to this width (book-editor page.tsx's center
// column: `maxWidth: 520`). A thumbnail is a much smaller, responsive
// tile, so px sizes are scaled via CSS container query units instead of a
// fixed px copy or JS/ResizeObserver.
const DESIGN_REFERENCE_WIDTH = 520;

export default function CoverThumbnail({
  design,
  seriesCoverUrl,
}: {
  design: ThumbCoverDesign;
  seriesCoverUrl: string | null;
}) {
  const bgStyle: React.CSSProperties =
    design.useSeriesCover && seriesCoverUrl
      ? { backgroundImage: `url(${seriesCoverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: design.backgroundColor };

  return (
    <div
      style={{
        ...bgStyle,
        position: "absolute",
        inset: 0,
        containerType: "inline-size",
      } as React.CSSProperties}
    >
      {design.blocks.map(b => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            left: `${b.x}%`,
            top: `${b.y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: `${(b.fontSize / DESIGN_REFERENCE_WIDTH) * 100}cqw`,
            color: b.color,
            fontWeight: b.bold ? 700 : 400,
            textAlign: b.align,
            whiteSpace: "pre-wrap",
            maxWidth: "80%",
          }}
        >
          {b.text}
        </div>
      ))}
    </div>
  );
}
