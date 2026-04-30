import type { DragState } from "../../types/workspace/interaction";
import { PlacementMode, SelectionSource, ToolbarMode } from "../../types/enums";
import type { NetworkEntity } from "../../types/entities";
import {
  SimulationEventType,
  SimulationMessageKind,
  type DroppedEventDetails,
  type BroadcastEventDetails,
  type MessageTransferEventDetails,
  type ThroughputCalculationEventDetails,
  type SimulationEvent,
  type SimulationMessage,
  type SimulationPeerSnapshot,
  type SimulationStepResult,
} from "../../types/simulation";
import type { WorkspacePanState } from "../../types/workspace/background";
import type { MessageAnimation } from "../../types/workspace/scene";
import type { WorkflowStep } from "../../types/steps";
import type { ToolbarPlacementMode } from "../../types/toolbar";
import type { WorkspaceTextItem } from "../../types/workspace";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWorkspaceBackground } from "../../hooks/workspace/useBackground";
import { useWorkspaceCreation } from "../../hooks/workspace/useCreation";
import { useWorkspaceDrag } from "../../hooks/workspace/useDrag";
import { useWorkspaceHints } from "../../hooks/workspace/useHints";
import { useWorkspacePlacement } from "../../hooks/workspace/usePlacement";
import { useWorkspaceTextEdit } from "../../hooks/workspace/useTextEdit";
import { useWorkspaceDerived } from "../../hooks/workspace/useDerived";
import { ui } from "../../i18n/messages";
import { useToast } from "../../hooks/useToast";
import { clamp } from "../../utils/math/clamp";
import PacketStructureWindow from "../Simulation/PacketStructureWindow";
import SimulationPanel from "../Simulation/SimulationPanel";
import TableInspectionWindow from "../Simulation/TableInspectionWindow";
import WorkspaceScene from "./WorkspaceScene";

type WorkspaceProps = {
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  texts: WorkspaceTextItem[];
  setTexts: (value: WorkspaceTextItem[]) => void;
  selectedId: string | null;
  selectedSource: SelectionSource | null;
  placementMode: ToolbarPlacementMode;
  simulationInspectionMode: ToolbarMode;
  currentSimulationEvent: SimulationEvent | null;
  currentSimulationEventIndex: number;
  currentSimulationEventsTotal: number;
  currentSimulationStepResult: SimulationStepResult | null;
  canGoPrevSimulationEvent: boolean;
  canGoNextSimulationEvent: boolean;
  isSimulationActive: boolean;
  onPrevSimulationEvent: () => void;
  onNextSimulationEvent: () => void;
  onEntitySelect: (id: string) => void;
  onStepSelect: (id: string) => void;
  onClearSelection: () => void;
};

export default function Workspace({
  entities,
  setEntities,
  steps,
  setSteps,
  texts,
  setTexts,
  selectedId,
  selectedSource,
  placementMode,
  simulationInspectionMode,
  currentSimulationEvent,
  currentSimulationEventIndex,
  currentSimulationEventsTotal,
  currentSimulationStepResult,
  canGoPrevSimulationEvent,
  canGoNextSimulationEvent,
  isSimulationActive,
  onPrevSimulationEvent,
  onNextSimulationEvent,
  onEntitySelect,
  onStepSelect,
  onClearSelection,
}: WorkspaceProps) {
  const { showToast, dismissToast } = useToast();
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });

  const dragStateRef = useRef<DragState | null>(null);
  const [activeDragEntityId, setActiveDragEntityId] = useState<string | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [creationSelectedEntityId, setCreationSelectedEntityId] = useState<string | null>(null);
  const [moveTargetPreview, setMoveTargetPreview] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextDraft, setEditingTextDraft] = useState("");
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [simulationMessageHoverState, setSimulationMessageHoverState] = useState<{
    eventId: string | null;
    isHovered: boolean;
  }>({ eventId: null, isHovered: false });
  const [packetInspectorState, setPacketInspectorState] = useState<{
    eventId: string | null;
    isOpen: boolean;
    pinned: boolean;
  }>({ eventId: null, isOpen: false, pinned: false });
  const [simulationTqDisclosureByEvent, setSimulationTqDisclosureByEvent] = useState<
    Record<string, boolean>
  >({});
  const [simulationSequenceDisclosureByEvent, setSimulationSequenceDisclosureByEvent] = useState<
    Record<string, boolean>
  >({});
  const [hoveredSimulationPeerState, setHoveredSimulationPeerState] = useState<{
    eventId: string;
    peerId: string | null;
  } | null>(null);
  const [tableInspectionPeerState, setTableInspectionPeerState] = useState<{
    peerId: string | null;
    pinned: boolean;
    isOpen: boolean;
    stepId: string | null;
  }>({ peerId: null, pinned: false, isOpen: false, stepId: null });
  const tableInspectionSuppressHoverRef = useRef(false);
  const currentStepId = currentSimulationStepResult?.step.id ?? null;
  const linkSourcePeerIdRef = useRef<string | null>(null);
  const stepMessageSourcePeerIdRef = useRef<string | null>(null);
  const stepMovePeerIdRef = useRef<string | null>(null);
  const placementModeRef = useRef<ToolbarPlacementMode>(placementMode);
  const hintActiveRef = useRef(false);
  const restoreHintTimerRef = useRef<number | null>(null);
  const panStateRef = useRef<WorkspacePanState | null>(null);

  const {
    peers,
    obstacles,
    staticLinks,
    centerX,
    centerY,
    resolvedCreationSelectedEntityId,
    connections,
    rangePolygons,
    moveIndicators,
    selectedStepAffectedEntityIds,
  } = useWorkspaceDerived({
    entities,
    steps,
    selectedId,
    selectedSource,
    creationSelectedEntityId,
    placementMode,
    moveTargetPreview,
    workspaceSize,
  });

  const showCreationToast = useCallback(
    (text: string) => {
      hintActiveRef.current = false;
      showToast(text, 1800);
    },
    [showToast],
  );

  const {
    createPeerAt,
    createObstacleAt,
    createLink,
    createMessageStep,
    createMoveStep,
    createToggleStep,
    createTextAt,
  } = useWorkspaceCreation({
    entities,
    steps,
    texts,
    setters: {
      setEntities,
      setSteps,
      setTexts,
    },
    callbacks: {
      onEntitySelect,
      onStepSelect,
      showCreationToast,
    },
  });

  const { showPlacementHint, scheduleHintRestore } = useWorkspaceHints({
    refs: {
      placementModeRef,
      hintActiveRef,
      restoreHintTimerRef,
      linkSourcePeerIdRef,
      stepMessageSourcePeerIdRef,
      stepMovePeerIdRef,
    },
    state: {
      placementMode,
      resolvedCreationSelectedEntityId,
      peers,
    },
    actions: {
      showToast,
      dismissToast,
    },
  });

  const {
    handleTextPointerDown,
    handleObstaclePointerDown,
    handleObstacleResizeStart,
    handlePeerPointerDownForDrag,
    handleEntityPointerMove,
    handleEntityPointerEnd,
  } = useWorkspaceDrag({
    entities,
    texts,
    setEntities,
    setTexts,
    placementMode,
    refs: {
      dragStateRef,
    },
    setters: {
      setActiveDragEntityId,
      setSelectedTextId,
    },
    state: {
      editingTextId,
    },
    actions: {
      onEntitySelect,
      onTogglePlacementHint: showPlacementHint,
    },
  });

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setWorkspaceSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSimulationActive || event.key !== "Delete" || !selectedTextId || editingTextId) {
        return;
      }

      setTexts(texts.filter((item) => item.id !== selectedTextId));
      setSelectedTextId(null);
      showToast(ui.workspace.textDeleted);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingTextId, isSimulationActive, selectedTextId, setTexts, showToast, texts]);

  const { handleTextDoubleClick, commitTextEdit, cancelTextEdit } = useWorkspaceTextEdit({
    texts,
    editingTextId,
    editingTextDraft,
    setters: {
      setTexts,
      setSelectedTextId,
      setEditingTextId,
      setEditingTextDraft,
    },
  });

  const handleBackgroundClearSelection = useCallback(() => {
    if (isSimulationActive && selectedSource === SelectionSource.Steps) {
      return;
    }

    onClearSelection();
  }, [isSimulationActive, onClearSelection, selectedSource]);

  const { handleStaticLinkPointerDown, handlePeerPointerDown } = useWorkspacePlacement({
    refs: {
      linkSourcePeerIdRef,
      stepMessageSourcePeerIdRef,
      stepMovePeerIdRef,
    },
    state: {
      placementMode,
    },
    setters: {
      setCreationSelectedEntityId,
    },
    actions: {
      onEntitySelect,
      showPlacementHint,
      scheduleHintRestore,
      createMessageStep,
      createToggleStep,
      createLink,
      handlePeerPointerDownForDrag,
    },
  });

  const { handleBackgroundPointerDown, handleBackgroundPointerMove, handleBackgroundPointerEnd } =
    useWorkspaceBackground({
      refs: {
        workspaceRef,
        linkSourcePeerIdRef,
        stepMessageSourcePeerIdRef,
        stepMovePeerIdRef,
        panStateRef,
      },
      state: {
        placementMode,
        editingTextId,
        panOffset,
        workspaceSize,
      },
      setters: {
        setSelectedTextId,
        setCreationSelectedEntityId,
        setMoveTargetPreview,
        setPanOffset,
      },
      actions: {
        commitTextEdit,
        createTextAt,
        createPeerAt,
        createObstacleAt,
        createMoveStep,
        onClearSelection: handleBackgroundClearSelection,
        showPlacementHint,
        scheduleHintRestore,
      },
    });

  const isTableInspectionOpenForCurrentStep =
    tableInspectionPeerState.isOpen &&
    (tableInspectionPeerState.pinned || tableInspectionPeerState.stepId === currentStepId);
  const inspectedTablePeerId = isTableInspectionOpenForCurrentStep
    ? tableInspectionPeerState.peerId
    : null;
  const simulationAnchorPeerId = currentSimulationEvent?.peerId ?? null;

  const simulationAnchorPeer = simulationAnchorPeerId
    ? (currentSimulationStepResult?.snapshot.peers.find(
        (peer) => peer.id === simulationAnchorPeerId,
      ) ??
      peers.find((peer) => peer.id === simulationAnchorPeerId) ??
      null)
    : null;

  const simulationAnchorViewportPosition = simulationAnchorPeer
    ? {
        x: centerX + simulationAnchorPeer.x + panOffset.x,
        y: centerY + simulationAnchorPeer.y + panOffset.y,
      }
    : null;

  const isSimulationAnchorVisible = simulationAnchorViewportPosition
    ? simulationAnchorViewportPosition.x >= 0 &&
      simulationAnchorViewportPosition.x <= workspaceSize.width &&
      simulationAnchorViewportPosition.y >= 0 &&
      simulationAnchorViewportPosition.y <= workspaceSize.height
    : false;

  const simulationAnchorPosition =
    simulationAnchorPeer && simulationAnchorViewportPosition && isSimulationAnchorVisible
      ? {
          x:
            clamp(
              simulationAnchorViewportPosition.x,
              220,
              Math.max(220, workspaceSize.width - 220),
            ) - panOffset.x,
          y:
            clamp(
              simulationAnchorViewportPosition.y,
              168,
              Math.max(168, workspaceSize.height - 40),
            ) - panOffset.y,
        }
      : null;
  const simulationMessageAnimations = useMemo(
    () =>
      buildSimulationMessageAnimations(currentSimulationEvent, currentSimulationStepResult, peers),
    [currentSimulationEvent, currentSimulationStepResult, peers],
  );
  const isPacketInspectionActive = simulationInspectionMode === ToolbarMode.PacketStructure;
  const currentSimulationEventId = currentSimulationEvent?.id ?? null;
  const hoveredSimulationPeerId =
    currentSimulationEvent && hoveredSimulationPeerState?.eventId === currentSimulationEvent.id
      ? hoveredSimulationPeerState.peerId
      : null;
  const highlightedSimulationPeerId =
    simulationInspectionMode === ToolbarMode.RoutingTable
      ? inspectedTablePeerId
      : hoveredSimulationPeerId;

  const handleSimulationPeerHoverChange = useCallback(
    (peerId: string | null) => {
      if (!currentSimulationEvent) {
        setHoveredSimulationPeerState(null);
        return;
      }

      setHoveredSimulationPeerState({
        eventId: currentSimulationEvent.id,
        peerId,
      });
    },
    [currentSimulationEvent],
  );

  const handleSimulationTqDisclosureToggle = useCallback((eventId: string) => {
    setSimulationTqDisclosureByEvent((prev) => ({
      ...prev,
      [eventId]: !(prev[eventId] ?? false),
    }));
  }, []);

  const handleSimulationSequenceDisclosureToggle = useCallback((eventId: string) => {
    setSimulationSequenceDisclosureByEvent((prev) => ({
      ...prev,
      [eventId]: !(prev[eventId] ?? false),
    }));
  }, []);

  const handleTableInspectionPeerHoverChange = useCallback(
    (peerId: string | null) => {
      if (simulationInspectionMode !== ToolbarMode.RoutingTable) {
        return;
      }

      if (peerId === null) {
        tableInspectionSuppressHoverRef.current = false;
      }

      if (tableInspectionSuppressHoverRef.current) {
        return;
      }

      setTableInspectionPeerState((prev) => {
        if (prev.pinned) {
          return prev;
        }

        return {
          peerId,
          pinned: false,
          isOpen: peerId !== null,
          stepId: currentStepId,
        };
      });
    },
    [currentStepId, simulationInspectionMode],
  );

  const handleTableInspectionClose = useCallback(() => {
    tableInspectionSuppressHoverRef.current = true;
    setTableInspectionPeerState({
      peerId: null,
      pinned: false,
      isOpen: false,
      stepId: null,
    });
  }, []);

  const handleMessageAnimationHoverChange = useCallback(
    (isHovered: boolean) => {
      if (!isPacketInspectionActive) {
        return;
      }

      setSimulationMessageHoverState({
        eventId: currentSimulationEventId,
        isHovered,
      });

      if (!currentSimulationEventId) {
        return;
      }

      setPacketInspectorState((prev) => {
        if (prev.pinned && prev.eventId === currentSimulationEventId) {
          return prev;
        }

        if (isHovered) {
          return {
            eventId: currentSimulationEventId,
            isOpen: true,
            pinned: false,
          };
        }

        if (prev.eventId !== currentSimulationEventId) {
          return prev;
        }

        return {
          eventId: currentSimulationEventId,
          isOpen: false,
          pinned: false,
        };
      });
    },
    [currentSimulationEventId, isPacketInspectionActive],
  );

  const handleMessageAnimationInspectRequest = useCallback(() => {
    if (!currentSimulationEvent || !isPacketInspectionActive) {
      return;
    }

    setPacketInspectorState({
      eventId: currentSimulationEvent.id,
      isOpen: true,
      pinned: true,
    });
  }, [currentSimulationEvent, isPacketInspectionActive]);

  const handlePacketInspectorClose = useCallback(() => {
    setPacketInspectorState((prev) => ({
      ...prev,
      isOpen: false,
      pinned: false,
    }));
  }, []);

  const handleSimulationStaticLinkPointerDown = useCallback(
    (linkId: string, event: ReactPointerEvent<SVGLineElement>) => {
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
      edge: Parameters<typeof handleObstacleResizeStart>[1],
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
        setTableInspectionPeerState({
          peerId: peer.id,
          pinned: true,
          isOpen: true,
          stepId: currentStepId,
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
    ],
  );

  return (
    <section
      className={`workspace${placementMode ? " workspace--placing" : ""}${placementMode === PlacementMode.Link ? " workspace--linking" : ""}`}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerEnd}
      onPointerCancel={handleBackgroundPointerEnd}
      ref={workspaceRef}
    >
      <div
        className="workspace__grid"
        aria-hidden="true"
        style={{
          backgroundPosition: `calc(50% - 24px + ${panOffset.x}px) calc(50% - 24px + ${panOffset.y}px)`,
        }}
      />
      <div
        className="workspace__scene"
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
      >
        {currentSimulationStepResult && currentSimulationEvent && simulationAnchorPosition ? (
          <SimulationPanel
            key={`${currentSimulationStepResult.step.id}-${currentSimulationEvent.id}`}
            anchorX={simulationAnchorPosition.x}
            anchorY={simulationAnchorPosition.y}
            canGoNextEvent={canGoNextSimulationEvent}
            canGoPrevEvent={canGoPrevSimulationEvent}
            currentEvent={currentSimulationEvent}
            currentEventIndex={currentSimulationEventIndex}
            currentEventsTotal={currentSimulationEventsTotal}
            currentStepResult={currentSimulationStepResult}
            isTqDisclosureOpen={simulationTqDisclosureByEvent[currentSimulationEvent.id] ?? false}
            isSequenceDisclosureOpen={
              simulationSequenceDisclosureByEvent[currentSimulationEvent.id] ?? false
            }
            onPeerHoverChange={handleSimulationPeerHoverChange}
            onNextEvent={onNextSimulationEvent}
            onPrevEvent={onPrevSimulationEvent}
            onTqDisclosureToggle={handleSimulationTqDisclosureToggle}
            onSequenceDisclosureToggle={handleSimulationSequenceDisclosureToggle}
          />
        ) : null}
        <WorkspaceScene
          centerX={centerX}
          centerY={centerY}
          staticLinks={staticLinks}
          connections={connections}
          rangePolygons={rangePolygons}
          moveIndicators={moveIndicators}
          messageAnimations={simulationMessageAnimations}
          texts={texts}
          obstacles={obstacles}
          peers={peers}
          selectedSource={selectedSource}
          selectedId={selectedId}
          hoveredSimulationPeerId={highlightedSimulationPeerId}
          resolvedCreationSelectedEntityId={resolvedCreationSelectedEntityId}
          selectedStepAffectedEntityIds={selectedStepAffectedEntityIds}
          editingTextId={editingTextId}
          editingTextDraft={editingTextDraft}
          selectedTextId={selectedTextId}
          activeDragEntityId={activeDragEntityId}
          setEditingTextDraft={setEditingTextDraft}
          commitTextEdit={commitTextEdit}
          cancelTextEdit={cancelTextEdit}
          handleStaticLinkPointerDown={handleSimulationStaticLinkPointerDown}
          handleTextPointerDown={handleSimulationTextPointerDown}
          handleTextDoubleClick={handleSimulationTextDoubleClick}
          handleEntityPointerMove={handleEntityPointerMove}
          handleEntityPointerEnd={handleEntityPointerEnd}
          handleObstaclePointerDown={handleSimulationObstaclePointerDown}
          handleObstacleResizeStart={handleSimulationObstacleResizeStart}
          handlePeerPointerDown={handleSimulationPeerPointerDown}
          onPeerHoverChange={handleTableInspectionPeerHoverChange}
          onMessageAnimationHoverChange={handleMessageAnimationHoverChange}
          onMessageAnimationInspectRequest={handleMessageAnimationInspectRequest}
        />
      </div>
      <PacketStructureWindow
        isOpen={
          isPacketInspectionActive &&
          packetInspectorState.isOpen &&
          packetInspectorState.eventId === currentSimulationEvent?.id &&
          (packetInspectorState.pinned ||
            (simulationMessageHoverState.eventId === currentSimulationEvent?.id &&
              simulationMessageHoverState.isHovered))
        }
        currentEvent={currentSimulationEvent}
        currentStepResult={currentSimulationStepResult}
        onClose={handlePacketInspectorClose}
      />
      <TableInspectionWindow
        isOpen={isTableInspectionOpenForCurrentStep}
        currentStepResult={currentSimulationStepResult}
        currentEventId={currentSimulationEvent?.id ?? null}
        inspectedPeerId={inspectedTablePeerId}
        onClose={handleTableInspectionClose}
        onPeerHoverChange={handleSimulationPeerHoverChange}
      />
    </section>
  );
}

const buildSimulationMessageAnimations = (
  currentEvent: SimulationEvent | null,
  currentStepResult: SimulationStepResult | null,
  fallbackPeers: Array<NetworkEntity & { type: "PEER" }>,
): MessageAnimation[] => {
  if (!currentEvent || !currentStepResult) {
    return [];
  }

  const peerById = new Map<string, SimulationPeerSnapshot | (NetworkEntity & { type: "PEER" })>();

  for (const peer of currentStepResult.snapshot.peers) {
    peerById.set(peer.id, peer);
  }

  for (const peer of fallbackPeers) {
    if (!peerById.has(peer.id)) {
      peerById.set(peer.id, peer);
    }
  }

  const createAnimation = (
    sourcePeerId: string | null,
    targetPeerId: string | null,
    suffix: string,
    variant: MessageAnimation["variant"] = "default",
  ): MessageAnimation | null => {
    if (!sourcePeerId || !targetPeerId || sourcePeerId === targetPeerId) {
      return null;
    }

    const sourcePeer = peerById.get(sourcePeerId);
    const targetPeer = peerById.get(targetPeerId);
    if (!sourcePeer || !targetPeer) {
      return null;
    }

    return {
      key: `${currentEvent.id}-${suffix}-${sourcePeerId}-${targetPeerId}`,
      sourceX: sourcePeer.x,
      sourceY: sourcePeer.y,
      targetX: targetPeer.x,
      targetY: targetPeer.y,
      variant,
    };
  };

  if (currentEvent.type === SimulationEventType.SystemMessageBroadcast) {
    const details = currentEvent.details as BroadcastEventDetails;
    return details.neighbourPeerIds
      .map((peerId, index) =>
        createAnimation(currentEvent.peerId, peerId, `broadcast-${index}`, "default"),
      )
      .filter((animation): animation is MessageAnimation => animation !== null);
  }

  if (currentEvent.type === SimulationEventType.SystemMessageSent) {
    const details = currentEvent.details as MessageTransferEventDetails;
    return toMessageAnimations([
      createAnimation(currentEvent.peerId, details.hopPeerId, "sent", "default"),
    ]);
  }

  if (currentEvent.type === SimulationEventType.SystemMessageDropped) {
    const details = currentEvent.details as DroppedEventDetails;
    const droppedAnimation = getDroppedMessageAnimation(currentEvent.peerId, details.message);
    return toMessageAnimations([
      createAnimation(
        droppedAnimation?.sourcePeerId ?? null,
        droppedAnimation?.targetPeerId ?? null,
        "dropped",
        "dropped",
      ),
    ]);
  }

  if (currentEvent.type === SimulationEventType.SystemThroughputCalculated) {
    const details = currentEvent.details as ThroughputCalculationEventDetails;
    if (details.message.kind === SimulationMessageKind.BatmanOriginatorMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          currentEvent.peerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          currentEvent.peerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    return [];
  }

  if (
    currentEvent.type === SimulationEventType.RoutingTableInsert ||
    currentEvent.type === SimulationEventType.RoutingTableUpdate ||
    currentEvent.type === SimulationEventType.RoutingTableRemove
  ) {
    const details = currentEvent.details as { hopPeerId: string };
    return toMessageAnimations([
      createAnimation(details.hopPeerId, currentEvent.peerId, "route-change", "route-change"),
    ]);
  }

  return [];
};

const getDroppedMessageAnimation = (
  eventPeerId: string,
  message: SimulationMessage,
): { sourcePeerId: string; targetPeerId: string } | null => {
  if (message.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.kind !== SimulationMessageKind.Packet) {
    return null;
  }

  if (message.sourcePeerId && message.sourcePeerId !== eventPeerId) {
    return { sourcePeerId: message.sourcePeerId, targetPeerId: eventPeerId };
  }

  return message.destinationPeerId !== eventPeerId
    ? { sourcePeerId: eventPeerId, targetPeerId: message.destinationPeerId }
    : null;
};

const toMessageAnimations = (animations: Array<MessageAnimation | null>) => {
  return animations.filter((animation): animation is MessageAnimation => animation !== null);
};
