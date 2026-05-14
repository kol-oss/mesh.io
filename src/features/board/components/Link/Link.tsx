import { shortenLine } from "@/shared/processor/connectivity";
import type { UUID } from "@/shared/types/common/uuid";

type LinkShape = {
  id: UUID;
  enabled: boolean;
  sourceX: number;
  sourceY: number;
  destinationX: number;
  destinationY: number;
};

type Props = {
  link: LinkShape;
  centerX: number;
  centerY: number;
  isSelected: boolean;
  isStatusTransitioning: boolean;
  onPointerDown: (linkId: UUID, event: React.PointerEvent<SVGLineElement>) => void;
};

export default function Link({
  link,
  centerX,
  centerY,
  isSelected,
  isStatusTransitioning,
  onPointerDown,
}: Props) {
  const rawSourceX = centerX + link.sourceX;
  const rawSourceY = centerY + link.sourceY;
  const rawTargetX = centerX + link.destinationX;
  const rawTargetY = centerY + link.destinationY;
  const { x1, y1, x2, y2 } = shortenLine(rawSourceX, rawSourceY, rawTargetX, rawTargetY, 14);

  return (
    <g
      className={`workspace__static-link ${link.enabled ? "workspace__static-link--enabled" : "workspace__static-link--disabled"}${isSelected ? " workspace__static-link--selected" : ""}${isStatusTransitioning ? " workspace__static-link--status-transition" : ""}`}
    >
      <line
        className="workspace__static-link-hit"
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        onPointerDown={(event) => onPointerDown(link.id, event)}
      />
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
    </g>
  );
}
