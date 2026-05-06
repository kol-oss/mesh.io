import type { DragState } from "../../types/workspace/interaction";
import { PlacementMode, SelectionSource, ToolbarMode } from "../../types/enums";
import type { NetworkEntity } from "../../types/entities";
import { type SimulationEvent, type SimulationStepResult } from "../../types/simulation";
import type { WorkspacePanState } from "../../types/workspace/background";
import type { WorkflowStep } from "../../types/steps";
import type { ToolbarPlacementMode } from "../../types/toolbar";
import type { WorkspaceTextItem } from "../../types/workspace";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWorkspaceBackground } from "../../hooks/workspace/useBackground";
import { useWorkspaceCreation } from "../../hooks/workspace/useCreation";
import { useWorkspaceDrag } from "../../hooks/workspace/useDrag";
import { useWorkspaceHints } from "../../hooks/workspace/useHints";
import { useWorkspacePlacement } from "../../hooks/workspace/usePlacement";
import { useWorkspaceTextEdit } from "../../hooks/workspace/useTextEdit";
import { useWorkspaceDerived } from "../../hooks/workspace/useDerived";
import { useWorkspaceAnimations } from "../../hooks/workspace/useAnimations";
import { useWorkspaceWindowStates } from "../../hooks/workspace/useWindowStates";
import { useMoveIndicatorHandlers } from "../../hooks/workspace/useMoveIndicators";
import { useSimulationEventHandlers } from "../../hooks/workspace/useSimulationEventHandlers";
import { ui } from "../../i18n/messages";
import { useToast } from "../../hooks/useToast";
import { clamp } from "../../utils/math/clamp";
import PacketStructureWindow from "../Simulation/PacketStructureWindow";
import SimulationPanel from "../Simulation/SimulationPanel";
import TableInspectionWindow from "../Simulation/TableInspectionWindow";
import WorkspaceScene from "./WorkspaceScene";
import type { UUID } from "../../types/uuid";

type WorkspaceProps = {
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  texts: WorkspaceTextItem[];
  setTexts: (value: WorkspaceTextItem[]) => void;
  selectedId: UUID | null;
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
  onEntitySelect: (id: UUID) => void;
  onStepSelect: (id: UUID) => void;
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
  const [activeDragEntityId, setActiveDragEntityId] = useState<UUID | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [creationSelectedEntityId, setCreationSelectedEntityId] = useState<UUID | null>(null);
  const [moveTargetPreview, setMoveTargetPreview] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<UUID | null>(null);
  const [editingTextDraft, setEditingTextDraft] = useState("");
  const [selectedTextId, setSelectedTextId] = useState<UUID | null>(null);
  const currentStepId = currentSimulationStepResult?.step.id ?? null;
  const linkSourcePeerIdRef = useRef<UUID | null>(null);
  const stepMessageSourcePeerIdRef = useRef<UUID | null>(null);
  const stepMovePeerIdRef = useRef<UUID | null>(null);
  const placementModeRef = useRef<ToolbarPlacementMode>(placementMode);
  const hintActiveRef = useRef(false);
  const restoreHintTimerRef = useRef<number | null>(null);
  const panStateRef = useRef<WorkspacePanState | null>(null);

  const baseRenderedEntities = useMemo(
    () =>
      isSimulationActive && currentSimulationStepResult
        ? currentSimulationStepResult.snapshot.entities
        : entities,
    [currentSimulationStepResult, entities, isSimulationActive],
  );

  const simulationAnimationFallbackPeers = useMemo(
    () =>
      baseRenderedEntities.filter(
        (entity): entity is NetworkEntity & { type: "PEER" } => entity.type === "PEER",
      ),
    [baseRenderedEntities],
  );

  const { moveStepAnimation, toggleStepAnimation, simulationMessageAnimations, renderedEntities } =
    useWorkspaceAnimations({
      currentSimulationEvent,
      currentSimulationStepResult,
      baseRenderedEntities,
      peers: simulationAnimationFallbackPeers,
    });

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
    entities: renderedEntities,
    steps,
    selectedId,
    selectedSource,
    creationSelectedEntityId,
    placementMode,
    moveTargetPreview,
    workspaceSize,
  });

  const isPacketInspectionActive = simulationInspectionMode === ToolbarMode.PacketStructure;
  const currentSimulationEventId = currentSimulationEvent?.id ?? null;

  const {
    packetInspectorWindows,
    tableInspectionWindows,
    simulationMessageHoverState,
    simulationTqDisclosureByEvent,
    simulationSequenceDisclosureByEvent,
    hoveredSimulationPeerState,
    tableInspectionSuppressHoverRef,
    handleSimulationPeerHoverChange,
    handleSimulationTqDisclosureToggle,
    handleSimulationSequenceDisclosureToggle,
    handleTableInspectionPeerHoverChange,
    handleTableInspectionClose,
    handleMessageAnimationHoverChange,
    handleMessageAnimationInspectRequest,
    handlePacketInspectorClose,
    setTableInspectionWindows,
  } = useWorkspaceWindowStates({
    currentSimulationEvent,
    currentStepId,
    simulationInspectionMode,
    isPacketInspectionActive,
    currentSimulationEventId,
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

  const inspectedTablePeerId =
    tableInspectionWindows.find((w) => w.isOpen && (w.pinned || w.stepId === currentStepId))
      ?.peerId ?? null;
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
  const hoveredSimulationPeerId =
    currentSimulationEvent && hoveredSimulationPeerState?.eventId === currentSimulationEvent.id
      ? hoveredSimulationPeerState.peerId
      : null;
  const highlightedSimulationPeerId =
    simulationInspectionMode === ToolbarMode.RoutingTable
      ? inspectedTablePeerId
      : hoveredSimulationPeerId;

  const getWorkspaceCoordsByClientPosition = useCallback(
    (clientX: number, clientY: number) => {
      const element = workspaceRef.current;
      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      return {
        x: Math.round(localX - workspaceSize.width / 2 - panOffset.x),
        y: Math.round(localY - workspaceSize.height / 2 - panOffset.y),
      };
    },
    [panOffset.x, panOffset.y, workspaceSize.height, workspaceSize.width],
  );

  const {
    handleMoveIndicatorPointerDown,
    handleMoveIndicatorPointerMove,
    handleMoveIndicatorPointerEnd,
  } = useMoveIndicatorHandlers({
    steps,
    setSteps,
    isSimulationActive,
    getWorkspaceCoordsByClientPosition,
  });

  const {
    handleSimulationStaticLinkPointerDown,
    handleSimulationTextPointerDown,
    handleSimulationTextDoubleClick,
    handleSimulationObstaclePointerDown,
    handleSimulationObstacleResizeStart,
    handleSimulationPeerPointerDown,
  } = useSimulationEventHandlers({
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
  });

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
          moveStepAnimation={moveStepAnimation}
          toggleStepAnimation={toggleStepAnimation}
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
          handleMoveIndicatorPointerDown={handleMoveIndicatorPointerDown}
          handleMoveIndicatorPointerMove={handleMoveIndicatorPointerMove}
          handleMoveIndicatorPointerEnd={handleMoveIndicatorPointerEnd}
          onPeerHoverChange={handleTableInspectionPeerHoverChange}
          onMessageAnimationHoverChange={handleMessageAnimationHoverChange}
          onMessageAnimationInspectRequest={handleMessageAnimationInspectRequest}
        />
      </div>
      {packetInspectorWindows.map((w) => {
        const event = currentSimulationStepResult?.events.find((e) => e.id === w.eventId) ?? null;
        const shouldRender =
          !!event &&
          w.isOpen &&
          (w.pinned ||
            (simulationMessageHoverState.eventId === w.eventId &&
              simulationMessageHoverState.isHovered));

        return (
          shouldRender && (
            <PacketStructureWindow
              key={`packet-window-${w.eventId}`}
              isOpen={true}
              currentEvent={event}
              currentStepResult={currentSimulationStepResult}
              onClose={() => handlePacketInspectorClose(w.eventId)}
            />
          )
        );
      })}

      {tableInspectionWindows.map((w) => {
        const shouldRender = w.isOpen && (w.pinned || w.stepId === currentStepId);

        return (
          shouldRender && (
            <TableInspectionWindow
              key={`table-window-${w.peerId}`}
              isOpen={true}
              currentStepResult={currentSimulationStepResult}
              currentEventId={currentSimulationEvent?.id ?? null}
              inspectedPeerId={w.peerId}
              onClose={() => handleTableInspectionClose(w.peerId)}
              onPeerHoverChange={handleSimulationPeerHoverChange}
            />
          )
        );
      })}
    </section>
  );
}
