import { shortenLine } from "@/features/processor/utils/math/connectivity";
import { ConnectionType } from "@/shared/types/interaction";
import type { Connection } from "@/shared/types/workspace/interaction";

type Props = {
  connection: Connection;
  centerX: number;
  centerY: number;
  onPointerEnter: (payload: { key: string; x: number; y: number; distance: number }) => void;
  onPointerLeave: (key: string) => void;
};

export default function Connection({
  connection,
  centerX,
  centerY,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  const rawSourceX = centerX + connection.sourceX;
  const rawSourceY = centerY + connection.sourceY;
  const rawTargetX = centerX + connection.targetX;
  const rawTargetY = centerY + connection.targetY;
  const { x1, y1, x2, y2 } = shortenLine(rawSourceX, rawSourceY, rawTargetX, rawTargetY, 14);
  const isMutual = connection.type === ConnectionType.Mutual;
  const key = `${connection.type}-${connection.sourceId}-${connection.targetId}`;
  const distance = Math.hypot(
    connection.targetX - connection.sourceX,
    connection.targetY - connection.sourceY,
  );

  return (
    <g
      className={`workspace__connection ${
        isMutual ? "workspace__connection--mutual" : "workspace__connection--one-way"
      }`}
    >
      <line
        className="workspace__connection-hit"
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        onPointerEnter={() => onPointerEnter({ key, x: (x1 + x2) / 2, y: (y1 + y2) / 2, distance })}
        onPointerLeave={() => onPointerLeave(key)}
      />
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
    </g>
  );
}
