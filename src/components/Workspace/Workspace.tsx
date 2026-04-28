import {
  workspaceNewObstacleHeight,
  workspaceNewObstacleWidth,
  workspaceObstacleMinSize,
  workspaceNewPeerRange,
  workspacePanLimit,
  workspaceRangeSamples,
} from "../../constants/workspace";
import {
  getObstacleBounds,
  getRayDistanceWithObstacleBlocking,
  hasLineOfSight,
  shortenLine,
  toInt,
} from "../../utils/geometry";
import type {
  Connection,
  DragState,
  ObstacleResizeEdge,
  RangePolygon,
} from "../../types/interaction";
import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";
import type { ToolbarPlacementMode } from "../../types/toolbar";
import type { WorkspaceTextItem } from "../../types/workspace";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Radio } from "lucide-react";

import { clamp } from "../../utils/math/clamp";
import { useToast } from "../../hooks/useToast";
import { generateUUID } from "../../utils/uuid";
import { isRefreshStep } from "../../utils/navigation/refreshSteps";

type WorkspaceProps = {
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  texts: WorkspaceTextItem[];
  setTexts: (value: WorkspaceTextItem[]) => void;
  selectedId: string | null;
  selectedSource: "entities" | "steps" | null;
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
  const peers = useMemo(
    () => entities.filter((entity): entity is PeerEntity => entity.type === "PEER"),
    [entities],
  );
  const links = useMemo(
    () => entities.filter((entity): entity is LinkEntity => entity.type === "LINK"),
    [entities],
  );
  const obstacles = useMemo(
    () => entities.filter((entity): entity is ObstacleEntity => entity.type === "OBSTACLE"),
    [entities],
  );
  const peerById = useMemo(() => new Map(peers.map((peer) => [peer.id, peer])), [peers]);
  const staticLinks = useMemo(() => {
    return links
      .map((link) => {
        if (!link.sourcePeerId || !link.destinationPeerId) {
          return null;
        }

        const sourcePeer = peerById.get(link.sourcePeerId);
        const destinationPeer = peerById.get(link.destinationPeerId);
        if (!sourcePeer || !destinationPeer || sourcePeer.id === destinationPeer.id) {
          return null;
        }

        return {
          id: link.id,
          enabled: link.enabled,
          sourceX: sourcePeer.x,
          sourceY: sourcePeer.y,
          destinationX: destinationPeer.x,
          destinationY: destinationPeer.y,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [links, peerById]);
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
  const panStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const clearRestoreHintTimer = useCallback(() => {
    if (restoreHintTimerRef.current === null) {
      return;
    }

    window.clearTimeout(restoreHintTimerRef.current);
    restoreHintTimerRef.current = null;
  }, []);

  const resolvedCreationSelectedEntityId = useMemo(() => {
    if (!creationSelectedEntityId) {
      return null;
    }

    return entities.some((entity) => entity.id === creationSelectedEntityId)
      ? creationSelectedEntityId
      : null;
  }, [creationSelectedEntityId, entities]);

  const showCreationToast = useCallback(
    (text: string) => {
      hintActiveRef.current = false;
      showToast(text, 1800);
    },
    [showToast],
  );

  const showPlacementHint = useCallback(() => {
    const mode = placementModeRef.current;
    if (!mode) {
      return;
    }

    const text =
      mode === "peer"
        ? "Click on workspace to place a peer"
        : mode === "obstacle"
          ? "Click on workspace to place an obstacle"
          : mode === "link"
            ? linkSourcePeerIdRef.current
              ? "Select destination peer"
              : "Select source peer"
            : mode === "message"
              ? stepMessageSourcePeerIdRef.current
                ? "Select destination peer"
                : "Select source peer"
              : mode === "move"
                ? resolvedCreationSelectedEntityId
                  ? "Click destination point on workspace"
                  : "Select peer to move"
                : mode === "text"
                  ? "Click on workspace to place text"
                  : "Select a peer or link";

    hintActiveRef.current = true;
    showToast(text, null);
  }, [resolvedCreationSelectedEntityId, showToast]);

  const scheduleHintRestore = useCallback(
    (mode: ToolbarPlacementMode) => {
      clearRestoreHintTimer();
      restoreHintTimerRef.current = window.setTimeout(() => {
        if (placementModeRef.current !== mode) {
          return;
        }
        showPlacementHint();
      }, 1900);
    },
    [clearRestoreHintTimer, showPlacementHint],
  );

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
    placementModeRef.current = placementMode;

    if (placementMode !== "link") {
      linkSourcePeerIdRef.current = null;
    }

    if (placementMode !== "message") {
      stepMessageSourcePeerIdRef.current = null;
    }

    if (placementMode !== "move") {
      stepMovePeerIdRef.current = null;
    }

    clearRestoreHintTimer();

    if (!placementMode) {
      if (hintActiveRef.current) {
        dismissToast();
        hintActiveRef.current = false;
      }
      return;
    }

    showPlacementHint();
  }, [clearRestoreHintTimer, dismissToast, placementMode, showPlacementHint]);

  useEffect(() => {
    return () => {
      clearRestoreHintTimer();
    };
  }, [clearRestoreHintTimer]);

  useEffect(() => {
    const sourcePeerId = linkSourcePeerIdRef.current;
    if (!sourcePeerId) {
      return;
    }

    const stillExists = peers.some((peer) => peer.id === sourcePeerId);
    if (!stillExists) {
      linkSourcePeerIdRef.current = null;
    }

    if (
      stepMessageSourcePeerIdRef.current &&
      !peers.some((peer) => peer.id === stepMessageSourcePeerIdRef.current)
    ) {
      stepMessageSourcePeerIdRef.current = null;
    }

    if (stepMovePeerIdRef.current && !peers.some((peer) => peer.id === stepMovePeerIdRef.current)) {
      stepMovePeerIdRef.current = null;
    }
  }, [peers]);

  const obstacleBounds = useMemo(() => obstacles.map(getObstacleBounds), [obstacles]);

  const connections = useMemo(() => {
    const enabledPeers = peers.filter((peer) => peer.enabled);
    const result: Connection[] = [];

    for (let i = 0; i < enabledPeers.length; i += 1) {
      for (let j = i + 1; j < enabledPeers.length; j += 1) {
        const peerA = enabledPeers[i];
        const peerB = enabledPeers[j];
        const deltaX = peerB.x - peerA.x;
        const deltaY = peerB.y - peerA.y;
        const distance = Math.hypot(deltaX, deltaY);
        const clearLineOfSight = hasLineOfSight(peerA.x, peerA.y, peerB.x, peerB.y, obstacleBounds);

        const aToB = distance <= peerA.range && clearLineOfSight;
        const bToA = distance <= peerB.range && clearLineOfSight;

        if (aToB && bToA) {
          result.push({
            type: "MUTUAL",
            sourceId: peerA.id,
            targetId: peerB.id,
            sourceX: peerA.x,
            sourceY: peerA.y,
            targetX: peerB.x,
            targetY: peerB.y,
          });
          continue;
        }

        if (aToB) {
          result.push({
            type: "ONE_WAY",
            sourceId: peerA.id,
            targetId: peerB.id,
            sourceX: peerA.x,
            sourceY: peerA.y,
            targetX: peerB.x,
            targetY: peerB.y,
          });
        }

        if (bToA) {
          result.push({
            type: "ONE_WAY",
            sourceId: peerB.id,
            targetId: peerA.id,
            sourceX: peerB.x,
            sourceY: peerB.y,
            targetX: peerA.x,
            targetY: peerA.y,
          });
        }
      }
    }

    return result;
  }, [obstacleBounds, peers]);

  const centerX = workspaceSize.width / 2;
  const centerY = workspaceSize.height / 2;

  const rangePolygons = useMemo(() => {
    if (workspaceSize.width <= 0 || workspaceSize.height <= 0) {
      return [];
    }

    return peers
      .filter((peer) => peer.range > 0)
      .map<RangePolygon>((peer) => {
        const points: string[] = [];
        const baseX = centerX + peer.x;
        const baseY = centerY + peer.y;

        for (let index = 0; index <= workspaceRangeSamples; index += 1) {
          const angle = (index / workspaceRangeSamples) * Math.PI * 2;
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);
          const distance = getRayDistanceWithObstacleBlocking(
            peer.x,
            peer.y,
            dirX,
            dirY,
            peer.range,
            obstacleBounds,
          );
          const pointX = baseX + dirX * distance;
          const pointY = baseY + dirY * distance;
          points.push(`${pointX.toFixed(2)},${pointY.toFixed(2)}`);
        }

        const path = points.length > 0 ? `M ${points[0]} L ${points.slice(1).join(" L ")} Z` : "";

        return {
          peerId: peer.id,
          enabled: peer.enabled,
          selected: selectedSource === "entities" && selectedId === peer.id,
          path,
        };
      });
  }, [centerX, centerY, obstacleBounds, peers, selectedId, selectedSource, workspaceSize]);

  const updatePeerPosition = (peerId: string, x: number, y: number) => {
    const nextEntities = entities.map((entity) => {
      if (entity.type !== "PEER" || entity.id !== peerId) {
        return entity;
      }

      return {
        ...entity,
        x,
        y,
      };
    });

    setEntities(nextEntities);
  };

  const updateObstaclePosition = (obstacleId: string, x: number, y: number) => {
    const nextEntities = entities.map((entity) => {
      if (entity.type !== "OBSTACLE" || entity.id !== obstacleId) {
        return entity;
      }

      return {
        ...entity,
        x,
        y,
      };
    });

    setEntities(nextEntities);
  };

  const updateObstacleBounds = (
    obstacleId: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const nextEntities = entities.map((entity) => {
      if (entity.type !== "OBSTACLE" || entity.id !== obstacleId) {
        return entity;
      }

      return {
        ...entity,
        x,
        y,
        width,
        height,
      };
    });

    setEntities(nextEntities);
  };

  const updateTextPosition = (textId: string, x: number, y: number) => {
    const nextTexts = texts.map((item) =>
      item.id === textId
        ? {
            ...item,
            x,
            y,
          }
        : item,
    );

    setTexts(nextTexts);
  };

  const getWorkspaceCoords = (event: ReactPointerEvent<HTMLElement>) => {
    const element = workspaceRef.current;
    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    return {
      x: toInt(localX - workspaceSize.width / 2 - panOffset.x),
      y: toInt(localY - workspaceSize.height / 2 - panOffset.y),
    };
  };

  const createPeerAt = (x: number, y: number) => {
    const nextPeer: PeerEntity = {
      id: generateUUID(),
      name: `Peer`,
      type: "PEER",
      locked: false,
      x,
      y,
      range: workspaceNewPeerRange,
      enabled: true,
      protocols: ["BATMAN"],
      batmanOgmInterval: 1,
      batmanPurgeTimeout: 10,
    };

    setEntities([...entities, nextPeer]);
    onEntitySelect(nextPeer.id);
    showCreationToast(`Entity "${nextPeer.name}" added`);
  };

  const createObstacleAt = (x: number, y: number) => {
    const nextObstacle: ObstacleEntity = {
      id: generateUUID(),
      name: `Obstacle`,
      type: "OBSTACLE",
      locked: false,
      x,
      y,
      width: workspaceNewObstacleWidth,
      height: workspaceNewObstacleHeight,
    };

    setEntities([...entities, nextObstacle]);
    onEntitySelect(nextObstacle.id);
    showCreationToast(`Entity "${nextObstacle.name}" added`);
  };

  const createLink = (sourcePeerId: string, destinationPeerId: string) => {
    const nextLink: LinkEntity = {
      id: generateUUID(),
      name: `Link`,
      type: "LINK",
      locked: false,
      sourcePeerId,
      destinationPeerId,
      enabled: true,
    };

    setEntities([...entities, nextLink]);
    onEntitySelect(nextLink.id);
    showCreationToast(`Entity "${nextLink.name}" added`);
  };

  const createStep = (step: WorkflowStep) => {
    setSteps([...steps, step]);
    onStepSelect(step.id);
    showCreationToast(`Step "${step.title}" added`);
  };

  const getNextManualStepTick = () => {
    const manualSteps = steps.filter((step) => !isRefreshStep(step));
    if (manualSteps.length === 0) {
      return 1;
    }

    return Math.max(1, manualSteps[manualSteps.length - 1].tick);
  };

  const createMessageStep = (sourcePeerId: string, destinationPeerId: string) => {
    createStep({
      id: `step-${generateUUID()}`,
      title: "Message",
      type: "MESSAGE",
      tick: getNextManualStepTick(),
      sourcePeerId,
      destinationPeerId,
      targetEntityId: null,
      movePeerId: null,
      x: 0,
      y: 0,
    });
  };

  const createMoveStep = (movePeerId: string, x: number, y: number) => {
    createStep({
      id: `step-${generateUUID()}`,
      title: "Move",
      type: "MOVE",
      tick: getNextManualStepTick(),
      sourcePeerId: null,
      destinationPeerId: null,
      targetEntityId: null,
      movePeerId,
      x,
      y,
    });
  };

  const createToggleStep = (targetEntityId: string) => {
    createStep({
      id: `step-${generateUUID()}`,
      title: "Toggle",
      type: "TOGGLE",
      tick: getNextManualStepTick(),
      sourcePeerId: null,
      destinationPeerId: null,
      targetEntityId,
      movePeerId: null,
      x: 0,
      y: 0,
    });
  };

  const createTextAt = (x: number, y: number) => {
    const nextText: WorkspaceTextItem = {
      id: `text-${generateUUID()}`,
      text: "Text",
      x,
      y,
    };

    setTexts([...texts, nextText]);
    showCreationToast("Text added");
  };

  const handleTextDoubleClick = (item: WorkspaceTextItem) => {
    setSelectedTextId(item.id);
    setEditingTextId(item.id);
    setEditingTextDraft(item.text);
  };

  const handleTextPointerDown = (
    item: WorkspaceTextItem,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    setSelectedTextId(item.id);

    if (editingTextId === item.id) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      entityId: item.id,
      entityType: "TEXT",
      mode: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: item.x,
      startY: item.y,
    };
    setActiveDragEntityId(item.id);
  };

  const commitTextEdit = () => {
    if (!editingTextId) {
      return;
    }

    const nextText = editingTextDraft.trim();
    if (!nextText) {
      setTexts(texts.filter((item) => item.id !== editingTextId));
      setSelectedTextId(null);
      setEditingTextId(null);
      setEditingTextDraft("");
      return;
    }

    const nextItems = texts.map((item) =>
      item.id === editingTextId
        ? {
            ...item,
            text: nextText,
          }
        : item,
    );
    setTexts(nextItems);
    setSelectedTextId(editingTextId);
    setEditingTextId(null);
    setEditingTextDraft("");
  };

  const cancelTextEdit = () => {
    setEditingTextId(null);
    setEditingTextDraft("");
  };

  const selectedMoveStep = useMemo(() => {
    if (selectedSource !== "steps" || !selectedId) {
      return null;
    }

    const step = steps.find((candidate) => candidate.id === selectedId);
    if (!step || step.type !== "MOVE" || !step.movePeerId || isRefreshStep(step)) {
      return null;
    }

    const sourcePeer = peerById.get(step.movePeerId);
    if (!sourcePeer) {
      return null;
    }

    return {
      sourceX: sourcePeer.x,
      sourceY: sourcePeer.y,
      targetX: step.x,
      targetY: step.y,
      draft: false,
    };
  }, [peerById, selectedId, selectedSource, steps]);

  const draftMoveStep = useMemo(() => {
    if (placementMode !== "move" || !resolvedCreationSelectedEntityId || !moveTargetPreview) {
      return null;
    }

    const sourcePeer = peerById.get(resolvedCreationSelectedEntityId);
    if (!sourcePeer) {
      return null;
    }

    return {
      sourceX: sourcePeer.x,
      sourceY: sourcePeer.y,
      targetX: moveTargetPreview.x,
      targetY: moveTargetPreview.y,
      draft: true,
    };
  }, [moveTargetPreview, peerById, placementMode, resolvedCreationSelectedEntityId]);

  const moveIndicators = [selectedMoveStep, draftMoveStep].filter(
    (indicator): indicator is NonNullable<typeof indicator> => indicator !== null,
  );

  const selectedStepAffectedEntityIds = useMemo(() => {
    if (selectedSource !== "steps" || !selectedId) {
      return new Set<string>();
    }

    const step = steps.find((candidate) => candidate.id === selectedId);
    if (!step) {
      return new Set<string>();
    }

    const ids = new Set<string>();

    if (step.type === "MESSAGE") {
      if (step.sourcePeerId) ids.add(step.sourcePeerId);
      if (step.destinationPeerId) ids.add(step.destinationPeerId);
    }

    if (step.type === "MOVE") {
      if (step.movePeerId) ids.add(step.movePeerId);
    }

    if (step.type === "TOGGLE") {
      if (step.targetEntityId) ids.add(step.targetEntityId);
    }

    if (step.type === "REFRESH") {
      if (step.refreshPeerId) ids.add(step.refreshPeerId);
    }

    return ids;
  }, [selectedId, selectedSource, steps]);

  const handleStaticLinkPointerDown = (
    linkId: string,
    event: ReactPointerEvent<SVGLineElement>,
  ) => {
    event.stopPropagation();

    if (placementMode === "toggle") {
      setCreationSelectedEntityId(linkId);
      createToggleStep(linkId);
      setCreationSelectedEntityId(null);
      scheduleHintRestore("toggle");
      return;
    }

    onEntitySelect(linkId);
  };

  const handlePeerPointerDown = (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    if (placementMode === "message") {
      event.stopPropagation();
      const messageSourcePeerId = stepMessageSourcePeerIdRef.current;

      if (!messageSourcePeerId || messageSourcePeerId === peer.id) {
        stepMessageSourcePeerIdRef.current = peer.id;
        setCreationSelectedEntityId(peer.id);
        showPlacementHint();
        return;
      }

      createMessageStep(messageSourcePeerId, peer.id);
      stepMessageSourcePeerIdRef.current = null;
      setCreationSelectedEntityId(null);
      scheduleHintRestore("message");
      return;
    }

    if (placementMode === "move") {
      event.stopPropagation();
      stepMovePeerIdRef.current = peer.id;
      setCreationSelectedEntityId(peer.id);
      showPlacementHint();
      return;
    }

    if (placementMode === "toggle") {
      event.stopPropagation();
      setCreationSelectedEntityId(peer.id);
      createToggleStep(peer.id);
      setCreationSelectedEntityId(null);
      scheduleHintRestore("toggle");
      return;
    }

    if (placementMode === "link") {
      event.stopPropagation();
      const linkSourcePeerId = linkSourcePeerIdRef.current;

      if (!linkSourcePeerId || linkSourcePeerId === peer.id) {
        linkSourcePeerIdRef.current = peer.id;
        onEntitySelect(peer.id);
        showPlacementHint();
        return;
      }

      createLink(linkSourcePeerId, peer.id);
      linkSourcePeerIdRef.current = null;
      scheduleHintRestore("link");
      return;
    }

    onEntitySelect(peer.id);

    if (peer.locked) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      entityId: peer.id,
      entityType: "PEER",
      mode: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: peer.x,
      startY: peer.y,
    };
    setActiveDragEntityId(peer.id);
  };

  const handleObstaclePointerDown = (
    obstacle: ObstacleEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    if (placementMode) {
      event.stopPropagation();
      if (placementMode === "toggle") {
        showPlacementHint();
      }
      return;
    }

    onEntitySelect(obstacle.id);

    if (obstacle.locked) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      entityId: obstacle.id,
      entityType: "OBSTACLE",
      mode: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: obstacle.x,
      startY: obstacle.y,
    };
    setActiveDragEntityId(obstacle.id);
  };

  const handleObstacleResizeStart = (
    obstacle: ObstacleEntity,
    edge: ObstacleResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();

    if (placementMode) {
      onEntitySelect(obstacle.id);
      return;
    }

    onEntitySelect(obstacle.id);

    if (obstacle.locked) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      entityId: obstacle.id,
      entityType: "OBSTACLE",
      mode: "resize",
      resizeEdge: edge,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: obstacle.x,
      startY: obstacle.y,
      startWidth: obstacle.width,
      startHeight: obstacle.height,
    };
    setActiveDragEntityId(obstacle.id);
  };

  const handleEntityPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    const nextX = toInt(dragState.startX + deltaX);
    const nextY = toInt(dragState.startY + deltaY);

    if (dragState.mode === "move" && dragState.entityType === "PEER") {
      updatePeerPosition(dragState.entityId, nextX, nextY);
      return;
    }

    if (dragState.mode === "move" && dragState.entityType === "TEXT") {
      updateTextPosition(dragState.entityId, nextX, nextY);
      return;
    }

    if (dragState.mode === "move") {
      updateObstaclePosition(dragState.entityId, nextX, nextY);
      return;
    }

    if (dragState.entityType !== "OBSTACLE") {
      return;
    }

    const startWidth = dragState.startWidth ?? workspaceObstacleMinSize;
    const startHeight = dragState.startHeight ?? workspaceObstacleMinSize;
    const startLeft = dragState.startX - startWidth / 2;
    const startRight = dragState.startX + startWidth / 2;
    const startTop = dragState.startY - startHeight / 2;
    const startBottom = dragState.startY + startHeight / 2;
    const edge = dragState.resizeEdge;

    if (!edge) {
      return;
    }

    let nextObstacleX = dragState.startX;
    let nextObstacleY = dragState.startY;
    let nextObstacleWidth = startWidth;
    let nextObstacleHeight = startHeight;

    if (edge === "left") {
      const nextLeft = Math.min(startRight - workspaceObstacleMinSize, startLeft + deltaX);
      nextObstacleWidth = startRight - nextLeft;
      nextObstacleX = (nextLeft + startRight) / 2;
    }

    if (edge === "right") {
      const nextRight = Math.max(startLeft + workspaceObstacleMinSize, startRight + deltaX);
      nextObstacleWidth = nextRight - startLeft;
      nextObstacleX = (startLeft + nextRight) / 2;
    }

    if (edge === "top") {
      const nextTop = Math.min(startBottom - workspaceObstacleMinSize, startTop + deltaY);
      nextObstacleHeight = startBottom - nextTop;
      nextObstacleY = (nextTop + startBottom) / 2;
    }

    if (edge === "bottom") {
      const nextBottom = Math.max(startTop + workspaceObstacleMinSize, startBottom + deltaY);
      nextObstacleHeight = nextBottom - startTop;
      nextObstacleY = (startTop + nextBottom) / 2;
    }

    updateObstacleBounds(
      dragState.entityId,
      toInt(nextObstacleX),
      toInt(nextObstacleY),
      Math.max(workspaceObstacleMinSize, toInt(nextObstacleWidth)),
      Math.max(workspaceObstacleMinSize, toInt(nextObstacleHeight)),
    );

    return;
  };

  const handleEntityPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }

    dragStateRef.current = null;
    setActiveDragEntityId(null);
  };

  const handleBackgroundPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    setSelectedTextId(null);

    if (editingTextId) {
      commitTextEdit();
    }

    if (placementMode === "text") {
      const coords = getWorkspaceCoords(event);
      if (!coords) {
        return;
      }

      createTextAt(coords.x, coords.y);
      scheduleHintRestore("text");
      return;
    }

    if (placementMode === "peer" || placementMode === "obstacle") {
      const coords = getWorkspaceCoords(event);
      if (!coords) {
        return;
      }

      if (placementMode === "peer") {
        createPeerAt(coords.x, coords.y);
        scheduleHintRestore("peer");
      } else {
        createObstacleAt(coords.x, coords.y);
        scheduleHintRestore("obstacle");
      }

      return;
    }

    if (placementMode === "move") {
      const movePeerId = stepMovePeerIdRef.current;
      if (!movePeerId) {
        onClearSelection();
        showPlacementHint();
        return;
      }

      const coords = getWorkspaceCoords(event);
      if (!coords) {
        return;
      }

      createMoveStep(movePeerId, coords.x, coords.y);
      stepMovePeerIdRef.current = null;
      setCreationSelectedEntityId(null);
      setMoveTargetPreview(null);
      scheduleHintRestore("move");
      return;
    }

    onClearSelection();

    if (placementMode === "link") {
      linkSourcePeerIdRef.current = null;
      showPlacementHint();
      return;
    }

    if (placementMode === "message") {
      stepMessageSourcePeerIdRef.current = null;
      setCreationSelectedEntityId(null);
      showPlacementHint();
      return;
    }

    if (placementMode === "toggle") {
      showPlacementHint();
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    panStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
  };

  const handleBackgroundPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (placementMode === "move" && stepMovePeerIdRef.current) {
      const coords = getWorkspaceCoords(event);
      if (coords) {
        setMoveTargetPreview(coords);
      }
      return;
    }

    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pan.startClientX;
    const deltaY = event.clientY - pan.startClientY;
    setPanOffset({
      x: clamp(pan.startPanX + deltaX, -workspacePanLimit, workspacePanLimit),
      y: clamp(pan.startPanY + deltaY, -workspacePanLimit, workspacePanLimit),
    });
  };

  const handleBackgroundPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
    panStateRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  return (
    <section
      className={`workspace${placementMode ? " workspace--placing" : ""}${placementMode === "link" ? " workspace--linking" : ""}`}
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
        <svg className="workspace__static-links" aria-hidden="true">
          {staticLinks.map((link) => {
            const rawSourceX = centerX + link.sourceX;
            const rawSourceY = centerY + link.sourceY;
            const rawTargetX = centerX + link.destinationX;
            const rawTargetY = centerY + link.destinationY;
            const { x1, y1, x2, y2 } = shortenLine(
              rawSourceX,
              rawSourceY,
              rawTargetX,
              rawTargetY,
              14,
            );
            const isSelected =
              (selectedSource === "entities" && selectedId === link.id) ||
              resolvedCreationSelectedEntityId === link.id ||
              selectedStepAffectedEntityIds.has(link.id);

            return (
              <g
                key={link.id}
                className={`workspace__static-link ${link.enabled ? "workspace__static-link--enabled" : "workspace__static-link--disabled"}${isSelected ? " workspace__static-link--selected" : ""}`}
              >
                <line
                  className="workspace__static-link-hit"
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  onPointerDown={(event) => handleStaticLinkPointerDown(link.id, event)}
                />
                <line x1={x1} y1={y1} x2={x2} y2={y2} />
              </g>
            );
          })}
        </svg>
        <svg className="workspace__connections" aria-hidden="true">
          {connections.map((connection) => {
            const rawSourceX = centerX + connection.sourceX;
            const rawSourceY = centerY + connection.sourceY;
            const rawTargetX = centerX + connection.targetX;
            const rawTargetY = centerY + connection.targetY;
            const { x1, y1, x2, y2 } = shortenLine(
              rawSourceX,
              rawSourceY,
              rawTargetX,
              rawTargetY,
              14,
            );
            const isMutual = connection.type === "MUTUAL";

            return (
              <g
                key={`${connection.type}-${connection.sourceId}-${connection.targetId}`}
                className={`workspace__connection ${
                  isMutual ? "workspace__connection--mutual" : "workspace__connection--one-way"
                }`}
              >
                <line x1={x1} y1={y1} x2={x2} y2={y2} />
              </g>
            );
          })}
        </svg>
        <svg className="workspace__ranges" aria-hidden="true">
          {rangePolygons.map((polygon) => (
            <path
              key={polygon.peerId}
              d={polygon.path}
              className={`workspace__peer-range${polygon.selected ? " workspace__peer-range--selected" : ""}${polygon.enabled ? "" : " workspace__peer-range--disabled"}`}
            />
          ))}
        </svg>

        <svg className="workspace__step-indicators" aria-hidden="true">
          {moveIndicators.map((indicator, index) => {
            const sourceX = centerX + indicator.sourceX;
            const sourceY = centerY + indicator.sourceY;
            const targetX = centerX + indicator.targetX;
            const targetY = centerY + indicator.targetY;
            const { x1, y1, x2, y2 } = shortenLine(sourceX, sourceY, targetX, targetY, 14);

            return (
              <g
                key={`${indicator.draft ? "draft" : "step"}-${index}`}
                className={`workspace__step-indicator${indicator.draft ? " workspace__step-indicator--draft" : ""}`}
              >
                <line x1={x1} y1={y1} x2={x2} y2={y2} />
              </g>
            );
          })}
        </svg>

        {moveIndicators.map((indicator, index) => (
          <span
            key={`target-${indicator.draft ? "draft" : "step"}-${index}`}
            className={`workspace__step-indicator-target${indicator.draft ? " workspace__step-indicator-target--draft" : ""}`}
            style={{
              left: `calc(50% + ${indicator.targetX}px)`,
              top: `calc(50% + ${indicator.targetY}px)`,
            }}
            aria-hidden="true"
          >
            <Radio size={20} />
          </span>
        ))}

        {texts.map((item) => {
          const isEditing = editingTextId === item.id;

          if (isEditing) {
            return (
              <input
                key={item.id}
                className="workspace__text workspace__text--editing"
                style={{
                  left: `calc(50% + ${item.x}px)`,
                  top: `calc(50% + ${item.y}px)`,
                }}
                value={editingTextDraft}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) => setEditingTextDraft(event.target.value)}
                onBlur={commitTextEdit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitTextEdit();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelTextEdit();
                  }
                }}
                autoFocus
              />
            );
          }

          return (
            <button
              key={item.id}
              className={`workspace__text${selectedTextId === item.id ? " workspace__text--selected" : ""}${activeDragEntityId === item.id ? " workspace__text--dragging" : ""}`}
              style={{
                left: `calc(50% + ${item.x}px)`,
                top: `calc(50% + ${item.y}px)`,
              }}
              type="button"
              onPointerDown={(event) => handleTextPointerDown(item, event)}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              onDoubleClick={() => handleTextDoubleClick(item)}
              aria-label={`Text ${item.text}`}
            >
              {item.text}
            </button>
          );
        })}

        {obstacles.map((obstacle) => {
          const isSelected =
            (selectedSource === "entities" && selectedId === obstacle.id) ||
            resolvedCreationSelectedEntityId === obstacle.id ||
            selectedStepAffectedEntityIds.has(obstacle.id);
          return (
            <button
              key={obstacle.id}
              className={`workspace__obstacle${isSelected ? " workspace__obstacle--selected" : ""}${activeDragEntityId === obstacle.id ? " workspace__obstacle--dragging" : ""}`}
              style={{
                left: `calc(50% + ${obstacle.x}px)`,
                top: `calc(50% + ${obstacle.y}px)`,
                width: `${Math.max(1, obstacle.width)}px`,
                height: `${Math.max(1, obstacle.height)}px`,
              }}
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
                handleObstaclePointerDown(obstacle, event);
              }}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-label={`Obstacle ${obstacle.name}`}
            >
              <span
                className="workspace__obstacle-handle workspace__obstacle-handle--left"
                onPointerDown={(event) => handleObstacleResizeStart(obstacle, "left", event)}
                onPointerMove={handleEntityPointerMove}
                onPointerUp={handleEntityPointerEnd}
                onPointerCancel={handleEntityPointerEnd}
                aria-hidden="true"
              />
              <span
                className="workspace__obstacle-handle workspace__obstacle-handle--right"
                onPointerDown={(event) => handleObstacleResizeStart(obstacle, "right", event)}
                onPointerMove={handleEntityPointerMove}
                onPointerUp={handleEntityPointerEnd}
                onPointerCancel={handleEntityPointerEnd}
                aria-hidden="true"
              />
              <span
                className="workspace__obstacle-handle workspace__obstacle-handle--top"
                onPointerDown={(event) => handleObstacleResizeStart(obstacle, "top", event)}
                onPointerMove={handleEntityPointerMove}
                onPointerUp={handleEntityPointerEnd}
                onPointerCancel={handleEntityPointerEnd}
                aria-hidden="true"
              />
              <span
                className="workspace__obstacle-handle workspace__obstacle-handle--bottom"
                onPointerDown={(event) => handleObstacleResizeStart(obstacle, "bottom", event)}
                onPointerMove={handleEntityPointerMove}
                onPointerUp={handleEntityPointerEnd}
                onPointerCancel={handleEntityPointerEnd}
                aria-hidden="true"
              />
            </button>
          );
        })}

        {peers.map((peer) => {
          const isSelected =
            (selectedSource === "entities" && selectedId === peer.id) ||
            resolvedCreationSelectedEntityId === peer.id ||
            selectedStepAffectedEntityIds.has(peer.id);
          return (
            <div key={peer.id}>
              <button
                className={`workspace__peer${isSelected ? " workspace__peer--selected" : ""}${activeDragEntityId === peer.id ? " workspace__peer--dragging" : ""}${peer.enabled ? "" : " workspace__peer--disabled"}`}
                style={{
                  left: `calc(50% + ${peer.x}px)`,
                  top: `calc(50% + ${peer.y}px)`,
                }}
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  handlePeerPointerDown(peer, event);
                }}
                onPointerMove={handleEntityPointerMove}
                onPointerUp={handleEntityPointerEnd}
                onPointerCancel={handleEntityPointerEnd}
                aria-label={`Peer ${peer.name}`}
              >
                <span className="workspace__peer-icon">
                  <Radio size={20} />
                </span>
                <span className="workspace__peer-name">{peer.name}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
