import { useCallback } from "react";
import { useAppDispatch } from "@/shared/store/hooks";
import { pinTableInspectionWindow } from "@/shared/store/slices/simulationSlice";
import { EntityType } from "@/shared/types/model/entities";
import { ActionMode as ToolbarMode } from "@/shared/types/action";
import type { ResizeEdge } from "@/shared/types/interaction";
import type { NetworkEntity } from "@/shared/types/model/entities";
import type { UUID } from "@/shared/types/common/uuid";
import type { WorkspaceTextItem } from "@/shared/types/workspace/text";
import type { PointerEvent as ReactPointerEvent } from "react";

type ObstacleSelectionEntity = Extract<NetworkEntity, { type: typeof EntityType.Obstacle }>;
type PeerSelectionEntity = Extract<NetworkEntity, { type: typeof EntityType.Peer }>;

type Props = {
  isSimulationActive: boolean;
  simulationInspectionMode: ToolbarMode;
  onEntitySelect: (id: UUID) => void;
  handleStaticLinkPointerDown: (linkId: UUID, event: ReactPointerEvent<SVGLineElement>) => void;
  handleTextPointerDown: (item: WorkspaceTextItem, event: ReactPointerEvent<HTMLElement>) => void;
  handleTextDoubleClick: (item: WorkspaceTextItem) => void;
  handleObstaclePointerDown: (
    obstacle: ObstacleSelectionEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  handleObstacleResizeStart: (
    obstacle: ObstacleSelectionEntity,
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  handlePeerPointerDown: (
    peer: PeerSelectionEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
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
    obstacle: ObstacleSelectionEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  handleSimulationObstacleResizeStart: (
    obstacle: ObstacleSelectionEntity,
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  handleSimulationPeerPointerDown: (
    peer: PeerSelectionEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
};

export const useSimulationEventHandlers = ({
  isSimulationActive,
  simulationInspectionMode,
  onEntitySelect,
  handleStaticLinkPointerDown,
  handleTextPointerDown,
  handleTextDoubleClick,
  handleObstaclePointerDown,
  handleObstacleResizeStart,
  handlePeerPointerDown,
  tableInspectionSuppressHoverRef,
}: Props): Return => {
  const dispatch = useAppDispatch();
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
    (obstacle: ObstacleSelectionEntity, event: ReactPointerEvent<HTMLButtonElement>) => {
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
      obstacle: ObstacleSelectionEntity,
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
    (peer: PeerSelectionEntity, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isSimulationActive) {
        handlePeerPointerDown(peer, event);
        return;
      }

      event.stopPropagation();

      if (simulationInspectionMode === ToolbarMode.RoutingTable) {
        dispatch(pinTableInspectionWindow(peer.id));
        tableInspectionSuppressHoverRef.current = false;
        return;
      }

      onEntitySelect(peer.id);
    },
    [
      dispatch,
      handlePeerPointerDown,
      isSimulationActive,
      onEntitySelect,
      simulationInspectionMode,
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
