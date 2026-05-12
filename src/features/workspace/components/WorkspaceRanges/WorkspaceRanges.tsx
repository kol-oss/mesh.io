import type { WorkspaceSceneProps } from "../../../../shared/types/workspace/scene";

type Props = Pick<WorkspaceSceneProps, "rangePolygons" | "hoveredSimulationPeerId">;

export default function WorkspaceRanges({ rangePolygons, hoveredSimulationPeerId }: Props) {
  return (
    <svg className="workspace__ranges" aria-hidden="true">
      {rangePolygons.map((polygon) => (
        <path
          key={polygon.peerId}
          d={polygon.path}
          className={`workspace__peer-range${polygon.selected || hoveredSimulationPeerId === polygon.peerId ? " workspace__peer-range--selected" : ""}${polygon.enabled ? "" : " workspace__peer-range--disabled"}`}
        />
      ))}
    </svg>
  );
}
