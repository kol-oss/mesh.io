import { useCallback } from "react";
import { ToolbarMode } from "../../types/enums";
import type { ResizeEdge } from "../../types/enums";
import type { NetworkEntity } from "../../types/entities";
import type { UUID } from "../../types/uuid";
import type { WorkspaceTextItem } from "../../types/workspace";
import type { PointerEvent as ReactPointerEvent } from "react";

type Props = {
  isSimulationActive: boolean;
  currentStepId: UUID | null;
  simulationInspectionMode: ToolbarMode;
  onEntitySelect: (id: UUID) => void;
  handleStaticLinkPointerDown: (linkId: UUID, event: ReactPointerEvent<SVGLineElement>) => void;
  handleTextPointerDown: (item: WorkspaceTextItem, event: ReactPointerEvent<HTMLElement>) => void;
  handleTextDoubleClick: (item: WorkspaceTextItem) => void;
  handleObstaclePointerDown: (
    obstacle: NetworkEntity & { type: "OBSTACLE" },
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  handleObstacleResizeStart: (
    obstacle: NetworkEntity & { type: "OBSTACLE" },
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  handlePeerPointerDown: (
    peer: NetworkEntity & { type: "PEER" },
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  setTableInspectionWindows: (
    updater: (
      prev: Array<{ peerId: UUID; pinned: boolean; isOpen: boolean; stepId: UUID | null }>,
    ) => Array<{ peerId: UUID; pinned: boolean; isOpen: boolean; stepId: UUID | null }>,
  ) => void;
  tableInspectionSuppressHoverRef: React.MutableRefObject<boolean>;
};

type Return = {
  handleSimulationStaticLinkPointerDown: (
    linkId: UUID,
    event: ReactPointerEvent<SVGLineElement>,
  ) => void;
  handleSimulationTextPointerDown: (
    item: WorkspaceTextItem,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  handleSimulationTextDoubleClick: (item: WorkspaceTextItem) => void;
  handleSimulationObstaclePointerDown: (
    obstacle: NetworkEntity & { type: "OBSTACLE" },
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  handleSimulationObstacleResizeStart: (
    obstacle: NetworkEntity & { type: "OBSTACLE" },
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  handleSimulationPeerPointerDown: (
    peer: NetworkEntity & { type: "PEER" },
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
};

export const useSimulationEventHandlers = ({
  isSimulationActive,
  currentStepId,
  simulationInspectionMode,
  onEntitySelect,
  handleStaticLinkPointerDown,
  handleTextPointerDown,
  handleTextDoubleClick,
  handleObstaclePointerDown,
  handleObstacleResizeStart,
  handlePeerPointerDown,
  setTableInspectionWindows,
  tableInspectionSuppressHoverRef,
}: Props): Return => {
  const handleSimulationStaticLinkPointerDown = useCallback(
    (linkId: UUID, event: ReactPointerEvent<SVGLineElement>) => {
      if (!isSimulationActive) {
        handleStaticLinkPointerDown(linkId, event);
        return;
      }

      event.stopPropagation();
      onEntitySelect(linkId);
    },
    [handleStaticLinkPointerDown, isSimulationActive, onEntitySelect],
  );

  const handleSimulationTextPointerDown = useCallback(
    (item: WorkspaceTextItem, event: ReactPointerEvent<HTMLElement>) => {
      handleTextPointerDown(item, event);
    },
    [handleTextPointerDown],
  );

  const handleSimulationTextDoubleClick = useCallback(
    (item: WorkspaceTextItem) => {
      handleTextDoubleClick(item);
    },
    [handleTextDoubleClick],
  );

  const handleSimulationObstaclePointerDown = useCallback(
    (
      obstacle: NetworkEntity & { type: "OBSTACLE" },
      event: ReactPointerEvent<HTMLButtonElement>,
    ) => {
      if (!isSimulationActive) {
        handleObstaclePointerDown(obstacle, event);
        return;
      }

      event.stopPropagation();
      onEntitySelect(obstacle.id);
    },
    [handleObstaclePointerDown, isSimulationActive, onEntitySelect],
  );

  const handleSimulationObstacleResizeStart = useCallback(
    (
      obstacle: NetworkEntity & { type: "OBSTACLE" },
      edge: ResizeEdge,
      event: ReactPointerEvent<HTMLSpanElement>,
    ) => {
      if (!isSimulationActive) {
        handleObstacleResizeStart(obstacle, edge, event);
        return;
      }

      event.stopPropagation();
      onEntitySelect(obstacle.id);
    },
    [handleObstacleResizeStart, isSimulationActive, onEntitySelect],
  );

  const handleSimulationPeerPointerDown = useCallback(
    (peer: NetworkEntity & { type: "PEER" }, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isSimulationActive) {
        handlePeerPointerDown(peer, event);
        return;
      }

      event.stopPropagation();

      if (simulationInspectionMode === ToolbarMode.RoutingTable) {
        setTableInspectionWindows((prev) => {
          const existing = prev.find((w) => w.peerId === peer.id);
          if (existing) {
            return prev.map((w) =>
              w.peerId === peer.id
                ? { ...w, pinned: true, isOpen: true, stepId: currentStepId }
                : w,
            );
          }

          return [...prev, { peerId: peer.id, pinned: true, isOpen: true, stepId: currentStepId }];
        });
        tableInspectionSuppressHoverRef.current = false;
        return;
      }

      onEntitySelect(peer.id);
    },
    [
      currentStepId,
      handlePeerPointerDown,
      isSimulationActive,
      onEntitySelect,
      simulationInspectionMode,
      setTableInspectionWindows,
      tableInspectionSuppressHoverRef,
    ],
  );

  return {
    handleSimulationStaticLinkPointerDown,
    handleSimulationTextPointerDown,
    handleSimulationTextDoubleClick,
    handleSimulationObstaclePointerDown,
    handleSimulationObstacleResizeStart,
    handleSimulationPeerPointerDown,
  };
};
