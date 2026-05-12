import { useCallback, useMemo, useRef, useState } from "react";

import { useWorkspaceBackground } from "../../hooks/useBackground";
import { useWorkspaceCreation } from "../../hooks/useCreation";
import { useWorkspaceDerived } from "../../hooks/useDerived";
import { useWorkspaceDrag } from "../../hooks/useDrag";
import { useWorkspaceHints } from "../../hooks/useHints";
import { useMoveIndicatorHandlers } from "../../hooks/useMoveIndicators";
import { useWorkspacePlacement } from "../../hooks/usePlacement";
import { useWorkspaceSimulationFocus } from "../../hooks/useWorkspaceSimulationFocus";
import { useWorkspaceSize } from "../../hooks/useWorkspaceSize";
import { useWorkspaceTextDelete } from "../../hooks/useWorkspaceTextDelete";
import { useWorkspaceTextEdit } from "../../hooks/useTextEdit";
import { useSimulationEventHandlers } from "../../hooks/useSimulationEventHandlers";
import { useWorkspaceAnimations } from "../../hooks/useAnimations";
import { useWorkspaceWindowStates } from "../../hooks/useWindowStates";
import { useToast } from "../../../../shared/toast/useToast";
import { SelectionSource, ToolbarMode } from "../../../../shared/types/enums";
import type { NetworkEntity } from "../../../../shared/types/entities";
import { type SimulationEvent, type SimulationStepResult } from "../../../../shared/types/simulation";
import type { WorkflowStep } from "../../../../shared/types/steps";
import type { ToolbarPlacementMode } from "../../../../shared/types/toolbar";
import type { UUID } from "../../../../shared/types/uuid";
import type { WorkspaceTextItem } from "../../../../shared/types/workspace";
import type { WorkspacePanState } from "../../../../shared/types/workspace/background";
import type { DragState } from "../../../../shared/types/workspace/interaction";
import WorkspaceInspectionWindows from "../WorkspaceInspectionWindows/WorkspaceInspectionWindows";
import WorkspaceMainScene from "../WorkspaceMainScene/WorkspaceMainScene";

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

export default function WorkspaceCanvas({
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
  const workspaceSize = useWorkspaceSize(workspaceRef);

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
    setters: { setEntities, setSteps, setTexts },
    callbacks: { onEntitySelect, onStepSelect, showCreationToast },
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
    state: { placementMode, resolvedCreationSelectedEntityId, peers },
    actions: { showToast, dismissToast },
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
    refs: { dragStateRef },
    setters: { setActiveDragEntityId, setSelectedTextId },
    state: { editingTextId },
    actions: { onEntitySelect, onTogglePlacementHint: showPlacementHint },
  });

  useWorkspaceTextDelete({
    isSimulationActive,
    selectedTextId,
    editingTextId,
    texts,
    setTexts,
    setSelectedTextId,
    showToast,
  });

  const { handleTextDoubleClick, commitTextEdit, cancelTextEdit } = useWorkspaceTextEdit({
    texts,
    editingTextId,
    editingTextDraft,
    setters: { setTexts, setSelectedTextId, setEditingTextId, setEditingTextDraft },
  });

  const handleBackgroundClearSelection = useCallback(() => {
    if (isSimulationActive && selectedSource === SelectionSource.Steps) {
      return;
    }

    onClearSelection();
  }, [isSimulationActive, onClearSelection, selectedSource]);

  const { handleStaticLinkPointerDown, handlePeerPointerDown } = useWorkspacePlacement({
    refs: { linkSourcePeerIdRef, stepMessageSourcePeerIdRef, stepMovePeerIdRef },
    state: { placementMode },
    setters: { setCreationSelectedEntityId },
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
      state: { placementMode, editingTextId, panOffset, workspaceSize },
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

  const { simulationAnchorPosition, highlightedSimulationPeerId } = useWorkspaceSimulationFocus({
    tableInspectionWindows,
    currentStepId,
    currentSimulationEvent,
    currentSimulationStepResult,
    peers,
    simulationInspectionMode,
    hoveredSimulationPeerState,
    centerX,
    centerY,
    panOffset,
    workspaceSize,
  });

  return (
    <>
      <WorkspaceMainScene
        placementMode={placementMode}
        panOffset={panOffset}
        workspaceRef={workspaceRef}
        handleBackgroundPointerDown={handleBackgroundPointerDown}
        handleBackgroundPointerMove={handleBackgroundPointerMove}
        handleBackgroundPointerEnd={handleBackgroundPointerEnd}
        currentSimulationStepResult={currentSimulationStepResult}
        currentSimulationEvent={currentSimulationEvent}
        simulationAnchorPosition={simulationAnchorPosition}
        canGoNextSimulationEvent={canGoNextSimulationEvent}
        canGoPrevSimulationEvent={canGoPrevSimulationEvent}
        currentSimulationEventIndex={currentSimulationEventIndex}
        currentSimulationEventsTotal={currentSimulationEventsTotal}
        simulationTqDisclosureByEvent={simulationTqDisclosureByEvent}
        simulationSequenceDisclosureByEvent={simulationSequenceDisclosureByEvent}
        onPrevSimulationEvent={onPrevSimulationEvent}
        onNextSimulationEvent={onNextSimulationEvent}
        onSimulationPeerHoverChange={handleSimulationPeerHoverChange}
        onSimulationTqDisclosureToggle={handleSimulationTqDisclosureToggle}
        onSimulationSequenceDisclosureToggle={handleSimulationSequenceDisclosureToggle}
        workspaceSceneProps={{
          centerX,
          centerY,
          staticLinks,
          connections,
          rangePolygons,
          moveIndicators,
          messageAnimations: simulationMessageAnimations,
          moveStepAnimation,
          toggleStepAnimation,
          texts,
          obstacles,
          peers,
          selectedSource,
          selectedId,
          hoveredSimulationPeerId: highlightedSimulationPeerId,
          resolvedCreationSelectedEntityId,
          selectedStepAffectedEntityIds,
          editingTextId,
          editingTextDraft,
          selectedTextId,
          activeDragEntityId,
          setEditingTextDraft,
          commitTextEdit,
          cancelTextEdit,
          handleStaticLinkPointerDown: handleSimulationStaticLinkPointerDown,
          handleTextPointerDown: handleSimulationTextPointerDown,
          handleTextDoubleClick: handleSimulationTextDoubleClick,
          handleEntityPointerMove,
          handleEntityPointerEnd,
          handleObstaclePointerDown: handleSimulationObstaclePointerDown,
          handleObstacleResizeStart: handleSimulationObstacleResizeStart,
          handlePeerPointerDown: handleSimulationPeerPointerDown,
          handleMoveIndicatorPointerDown,
          handleMoveIndicatorPointerMove,
          handleMoveIndicatorPointerEnd,
          onPeerHoverChange: handleTableInspectionPeerHoverChange,
          onMessageAnimationHoverChange: handleMessageAnimationHoverChange,
          onMessageAnimationInspectRequest: handleMessageAnimationInspectRequest,
        }}
      />

      <WorkspaceInspectionWindows
        packetInspectorWindows={packetInspectorWindows}
        tableInspectionWindows={tableInspectionWindows}
        simulationMessageHoverState={simulationMessageHoverState}
        currentStepId={currentStepId}
        currentSimulationStepResult={currentSimulationStepResult}
        currentSimulationEvent={currentSimulationEvent}
        onPacketInspectorClose={handlePacketInspectorClose}
        onTableInspectionClose={handleTableInspectionClose}
        onSimulationPeerHoverChange={handleSimulationPeerHoverChange}
      />
    </>
  );
}
