import { useCallback, useMemo, useRef, useState } from "react";

import MainScene from "@/features/board/components/MainScene/MainScene";
import { useAnimations } from "@/features/board/hooks/useAnimations";
import { useBackground } from "@/features/board/hooks/useBackground";
import { useCreation } from "@/features/board/hooks/useCreation";
import { useDerived } from "@/features/board/hooks/useDerived";
import { useDrag } from "@/features/board/hooks/useDrag";
import { useHints } from "@/features/board/hooks/useHints";
import { useMoveIndicatorHandlers } from "@/features/board/hooks/useMoveIndicators";
import { usePlacement } from "@/features/board/hooks/usePlacement";
import { useSize } from "@/features/board/hooks/useSize";
import { useTextDelete } from "@/features/board/hooks/useTextDelete";
import { useTextEdit } from "@/features/board/hooks/useTextEdit";
import RoutingStructure from "@/features/simulation/components/RoutingStructure/RoutingStructure";
import { useSimulationEventHandlers } from "@/features/simulation/hooks/useSimulationEventHandlers";
import { useSimulationFocus } from "@/features/simulation/hooks/useSimulationFocus";
import { useWindowStates } from "@/features/simulation/hooks/useWindowStates";
import { useToast } from "@/shared/toast/useToast";
import type { ToolbarPlacementMode } from "@/shared/types/action";
import { ActionMode as ToolbarMode } from "@/shared/types/action";
import type { UUID } from "@/shared/types/common/uuid";
import type { NetworkEntity } from "@/shared/types/model/entities";
import type { Step } from "@/shared/types/model/steps";
import { type Event } from "@/shared/types/processor/events";
import { type StepResult } from "@/shared/types/processor/simulation";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import type { WorkspacePanState } from "@/shared/types/workspace/background";
import type { DragState } from "@/shared/types/workspace/interaction";
import type { WorkspaceTextItem } from "@/shared/types/workspace/text";

type CanvasProps = {
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: Step[];
  setSteps: (value: Step[]) => void;
  texts: WorkspaceTextItem[];
  setTexts: (value: WorkspaceTextItem[]) => void;
  selectedId: UUID | null;
  selectedSource: SelectionSource | null;
  placementMode: ToolbarPlacementMode;
  simulationInspectionMode: ToolbarMode;
  currentSimulationEvent: Event | null;
  currentSimulationEventIndex: number;
  currentSimulationEventsTotal: number;
  currentSimulationStepResult: StepResult | null;
  canGoPrevSimulationEvent: boolean;
  canGoNextSimulationEvent: boolean;
  isSimulationActive: boolean;
  onPrevSimulationEvent: () => void;
  onNextSimulationEvent: () => void;
  onEntitySelect: (id: UUID) => void;
  onStepSelect: (id: UUID) => void;
  onClearSelection: () => void;
};

export default function Canvas({
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
}: CanvasProps) {
  const { showToast, dismissToast } = useToast();
  const workspaceRef = useRef<HTMLElement | null>(null);
  const workspaceSize = useSize(workspaceRef);

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
    useAnimations({
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
  } = useDerived({
    entities: renderedEntities,
    steps,
    selectedId,
    selectedSource,
    creationSelectedEntityId,
    placementMode,
    moveTargetPreview,
    workspaceSize,
  });

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
  } = useWindowStates();

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
  } = useCreation({
    entities,
    steps,
    texts,
    setters: { setEntities, setSteps, setTexts },
    callbacks: { onEntitySelect, onStepSelect, showCreationToast },
  });

  const { showPlacementHint, scheduleHintRestore } = useHints({
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
  } = useDrag({
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

  useTextDelete({
    isSimulationActive,
    selectedTextId,
    editingTextId,
    texts,
    setTexts,
    setSelectedTextId,
    showToast,
  });

  const { handleTextDoubleClick, commitTextEdit, cancelTextEdit } = useTextEdit({
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

  const { handleStaticLinkPointerDown, handlePeerPointerDown } = usePlacement({
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
    useBackground({
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
    simulationInspectionMode,
    onEntitySelect,
    handleStaticLinkPointerDown,
    handleTextPointerDown,
    handleTextDoubleClick,
    handleObstaclePointerDown,
    handleObstacleResizeStart,
    handlePeerPointerDown,
    tableInspectionSuppressHoverRef,
  });

  const { simulationAnchorPosition, highlightedSimulationPeerId } = useSimulationFocus({
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
      <MainScene
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

      <RoutingStructure
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
