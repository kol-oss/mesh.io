import { useState } from "react";

import { ui } from "../../i18n/messages";
import type { WorkspaceSceneProps } from "../../types/workspace/scene";
import WorkspaceConnection from "../WorkspaceConnection/WorkspaceConnection";

type Props = Pick<WorkspaceSceneProps, "centerX" | "centerY" | "connections">;

export default function WorkspaceConnections({ centerX, centerY, connections }: Props) {
  const [hoveredConnection, setHoveredConnection] = useState<{
    key: string;
    x: number;
    y: number;
    distance: number;
  } | null>(null);

  return (
    <>
      <svg className="workspace__connections" aria-hidden="true">
        {connections.map((connection) => {
          const key = `${connection.type}-${connection.sourceId}-${connection.targetId}`;

          return (
            <WorkspaceConnection
              key={key}
              connection={connection}
              centerX={centerX}
              centerY={centerY}
              onPointerEnter={(payload) => setHoveredConnection(payload)}
              onPointerLeave={(leftKey) =>
                setHoveredConnection((prev) => (prev?.key === leftKey ? null : prev))
              }
            />
          );
        })}
      </svg>
      {hoveredConnection ? (
        <span
          className="workspace__connection-tooltip"
          style={{
            left: `${hoveredConnection.x}px`,
            top: `${hoveredConnection.y}px`,
          }}
          aria-hidden="true"
        >
          {ui.workspace.connectionDistance(hoveredConnection.distance)}
        </span>
      ) : null}
    </>
  );
}
