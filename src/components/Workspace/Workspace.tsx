import type { DragState } from "../../types/workspace/interaction";
import { PlacementMode, SelectionSource } from "../../types/enums";
import type { NetworkEntity } from "../../types/entities";
import type { WorkspacePanState } from "../../types/workspace/background";
import type { WorkflowStep } from "../../types/steps";
import type { ToolbarPlacementMode } from "../../types/toolbar";
import type { WorkspaceTextItem } from "../../types/workspace";
import { useCallback, useEffect, useRef, useState } from "react";

import { useWorkspaceBackground } from "../../hooks/workspace/useBackground";
import { useWorkspaceCreation } from "../../hooks/workspace/useCreation";
import { useWorkspaceDrag } from "../../hooks/workspace/useDrag";
import { useWorkspaceHints } from "../../hooks/workspace/useHints";
import { useWorkspacePlacement } from "../../hooks/workspace/usePlacement";
import { useWorkspaceTextEdit } from "../../hooks/workspace/useTextEdit";
import { useWorkspaceDerived } from "../../hooks/workspace/useDerived";
import { useToast } from "../../hooks/useToast";
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
        onClearSelection,
        showPlacementHint,
        scheduleHintRestore,
      },
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
        <WorkspaceScene
          centerX={centerX}
          centerY={centerY}
          staticLinks={staticLinks}
          connections={connections}
          rangePolygons={rangePolygons}
          moveIndicators={moveIndicators}
          texts={texts}
          obstacles={obstacles}
          peers={peers}
          selectedSource={selectedSource}
          selectedId={selectedId}
          resolvedCreationSelectedEntityId={resolvedCreationSelectedEntityId}
          selectedStepAffectedEntityIds={selectedStepAffectedEntityIds}
          editingTextId={editingTextId}
          editingTextDraft={editingTextDraft}
          selectedTextId={selectedTextId}
          activeDragEntityId={activeDragEntityId}
          setEditingTextDraft={setEditingTextDraft}
          commitTextEdit={commitTextEdit}
          cancelTextEdit={cancelTextEdit}
          handleStaticLinkPointerDown={handleStaticLinkPointerDown}
          handleTextPointerDown={handleTextPointerDown}
          handleTextDoubleClick={handleTextDoubleClick}
          handleEntityPointerMove={handleEntityPointerMove}
          handleEntityPointerEnd={handleEntityPointerEnd}
          handleObstaclePointerDown={handleObstaclePointerDown}
          handleObstacleResizeStart={handleObstacleResizeStart}
          handlePeerPointerDown={handlePeerPointerDown}
        />
      </div>
    </section>
  );
}
