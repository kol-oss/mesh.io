import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { ToolbarMode } from "../../types/enums";
import {
  SimulationMessageKind,
  SimulationEventType,
  type BatmanRouteRecord,
  type RoutingTableChangeDetails,
  type SimulationEvent,
  type SimulationMessage,
  type SimulationStepResult,
} from "../../types/simulation";

type SimulationPanelProps = {
  anchorX: number;
  anchorY: number;
  canGoNextEvent: boolean;
  canGoPrevEvent: boolean;
  currentEvent: SimulationEvent | null;
  currentEventIndex: number;
  currentEventsTotal: number;
  currentStepResult: SimulationStepResult | null;
  inspectionMode: ToolbarMode;
  isTqDisclosureOpen: boolean;
  onPeerHoverChange: (peerId: string | null) => void;
  onNextEvent: () => void;
  onPrevEvent: () => void;
  onTqDisclosureToggle: (eventId: string) => void;
};

export default function SimulationPanel({
  anchorX,
  anchorY,
  canGoNextEvent,
  canGoPrevEvent,
  currentEvent,
  currentEventIndex,
  currentEventsTotal,
  currentStepResult,
  inspectionMode,
  isTqDisclosureOpen,
  onPeerHoverChange,
  onNextEvent,
  onPrevEvent,
  onTqDisclosureToggle,
}: SimulationPanelProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      setDragOffset({
        x: dragState.startOffsetX + (event.clientX - dragState.startPointerX),
        y: dragState.startOffsetY + (event.clientY - dragState.startPointerY),
      });
    };

    const handlePointerEnd = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [isDragging]);

  if (!currentStepResult || !currentEvent) {
    return null;
  }

  const peerNameById = new Map(
    currentStepResult.snapshot.peers.map((peer) => [peer.id, peer.name]),
  );
  const routeChange = getRouteChange(currentEvent);
  const title = getEventTitle(currentEvent);
  const description = getEventDescription(
    currentEvent,
    inspectionMode,
    peerNameById,
    onPeerHoverChange,
  );
  const routeRows = routeChange ? getRouteRows(routeChange) : [];
  const routeTqExplanation = routeChange ? getRouteTqExplanation(currentEvent) : null;
  const messageSummary = routeChange
    ? null
    : getMessageSummary(currentEvent, peerNameById, onPeerHoverChange);
  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };
  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startOffsetX: dragOffset.x,
      startOffsetY: dragOffset.y,
    };
    setIsDragging(true);
    event.stopPropagation();
    event.preventDefault();
  };
  const handleTqDisclosureToggle = () => {
    onTqDisclosureToggle(currentEvent.id);
  };

  return (
    <aside
      className={`simulation-panel simulation-panel--tooltip${isDragging ? " simulation-panel--dragging" : ""}`}
      aria-label="Simulation event"
      onPointerDown={handlePointerDown}
      onMouseLeave={() => onPeerHoverChange(null)}
      style={{ left: `${anchorX + dragOffset.x}px`, top: `${anchorY + dragOffset.y}px` }}
    >
      <header className="simulation-panel__header" onPointerDown={handleHeaderPointerDown}>
        <h2 className="simulation-panel__title">{title}</h2>
        <span className="simulation-panel__tick">Tick {currentEvent.tick}</span>
      </header>

      <section className="simulation-panel__section">
        <p className="simulation-panel__description">{description}</p>
        {routeChange ? (
          <div className="simulation-panel__table-block">
            <table className="simulation-panel__table-view">
              <thead>
                <tr>
                  <th>Originator</th>
                  <th>Next Hop</th>
                  <th>TQ</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {routeRows.map((row, index) => (
                  <tr key={`${row.originatorPeerId}-${row.hopPeerId}-${index}`}>
                    <td>
                      {renderPeerName(
                        row.originatorPeerId,
                        getPeerLabel(row.originatorPeerId, peerNameById),
                        onPeerHoverChange,
                      )}
                    </td>
                    <td>
                      {renderPeerName(
                        row.hopPeerId,
                        getPeerLabel(row.hopPeerId, peerNameById),
                        onPeerHoverChange,
                      )}
                    </td>
                    <td>{row.quality}</td>
                    <td>{row.lastTick}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {routeTqExplanation ? (
              <div className="simulation-panel__tq-disclosure">
                <button
                  className="simulation-panel__tq-toggle"
                  type="button"
                  onClick={handleTqDisclosureToggle}
                  aria-expanded={isTqDisclosureOpen}
                >
                  <ChevronRight
                    size={12}
                    className={`simulation-panel__tq-toggle-icon${isTqDisclosureOpen ? " simulation-panel__tq-toggle-icon--open" : ""}`}
                  />
                  <span className="simulation-panel__tq-toggle-label">
                    {getRouteTqQuestion(currentEvent)}
                  </span>
                </button>
                {isTqDisclosureOpen ? (
                  <p className="simulation-panel__description simulation-panel__description--secondary">
                    {routeTqExplanation}
                  </p>
                ) : null}
              </div>
            ) : null}
            {isTqDisclosureOpen
              ? routeRows.map((row, index) => (
                  <div
                    className="simulation-panel__quality-window"
                    key={`window-${row.originatorPeerId}-${row.hopPeerId}-${index}`}
                  >
                    <p className="simulation-panel__quality-window-label">
                      Transaction Quality (TQ) Window
                    </p>
                    <div
                      className="simulation-panel__quality-window-bits"
                      aria-label="Quality window bits"
                    >
                      {row.qualityWindow.split("").map((bit, bitIndex) => (
                        <span
                          className={`simulation-panel__quality-window-bit${bit === "1" ? " simulation-panel__quality-window-bit--active" : ""}`}
                          key={`${row.originatorPeerId}-${row.hopPeerId}-${bitIndex}`}
                        >
                          {bit}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              : null}
          </div>
        ) : messageSummary ? (
          <div className="simulation-panel__table-block">
            <table className="simulation-panel__table-view simulation-panel__table-view--message">
              <tbody>
                {messageSummary.map((item) => (
                  <tr key={item.label}>
                    <th scope="row">{item.label}</th>
                    <td>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="simulation-panel__empty">No event details available.</p>
        )}
      </section>

      <footer className="simulation-panel__footer">
        <button className="simulation-panel__read-more" type="button">
          <ExternalLink size={12} />
          Read more
        </button>
        <div className="simulation-panel__pager simulation-panel__pager--footer">
          <button
            className="simulation-panel__pager-button"
            type="button"
            onClick={onPrevEvent}
            disabled={!canGoPrevEvent}
            aria-label="Previous event"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="simulation-panel__pager-label">
            {currentEventsTotal === 0 ? "0/0" : `${currentEventIndex + 1}/${currentEventsTotal}`}
          </span>
          <button
            className="simulation-panel__pager-button"
            type="button"
            onClick={onNextEvent}
            disabled={!canGoNextEvent}
            aria-label="Next event"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </aside>
  );
}

const getEventTitle = (event: SimulationEvent) => {
  const message = getEventMessage(event);
  const routeChange = getRouteChange(event);

  switch (event.type) {
    case SimulationEventType.RoutingTableInsert:
      return getRouteInsertTitle(message, routeChange);
    case SimulationEventType.RoutingTableUpdate:
      return getRouteUpdateTitle(message, routeChange);
    case SimulationEventType.RoutingTableRemove:
      return getRouteRemoveTitle(message, routeChange);
    case SimulationEventType.SystemMessageBroadcast:
      return getBroadcastTitle(event, message);
    case SimulationEventType.SystemMessageSent:
      return "Send Message";
    case SimulationEventType.SystemMessageReceived:
      return "Receive Message";
    case SimulationEventType.SystemMessageDropped:
      return getDroppedTitle(message);
    default:
      return "Simulation Event";
  }
};

const getEventDescription = (
  event: SimulationEvent,
  inspectionMode: ToolbarMode,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const actor = getPeerLabel(event.peerId, peerNameById);
  const routeChange = getRouteChange(event);
  const message = getEventMessage(event);

  if (routeChange) {
    if (event.type === SimulationEventType.RoutingTableInsert) {
      return getRouteInsertDescription(
        event.peerId,
        actor,
        routeChange,
        message,
        peerNameById,
        onPeerHoverChange,
      );
    }

    if (event.type === SimulationEventType.RoutingTableUpdate) {
      return getRouteUpdateDescription(
        event.peerId,
        actor,
        routeChange,
        message,
        peerNameById,
        onPeerHoverChange,
      );
    }

    return getRouteRemoveDescription(
      event.peerId,
      actor,
      routeChange,
      message,
      peerNameById,
      onPeerHoverChange,
    );
  }

  if (inspectionMode === ToolbarMode.PacketStructure) {
    switch (event.type) {
      case SimulationEventType.SystemMessageBroadcast:
        return getBroadcastDescription(
          event.peerId,
          actor,
          event,
          message,
          peerNameById,
          onPeerHoverChange,
        );
      case SimulationEventType.SystemMessageSent:
        return `${actor} sent a message to the selected next hop.`;
      case SimulationEventType.SystemMessageReceived:
        return `${actor} received a message and handled it locally.`;
      case SimulationEventType.SystemMessageDropped:
        return getDroppedDescription(event.peerId, actor, message, onPeerHoverChange);
      default:
        return `${actor} emitted a simulation event.`;
    }
  }

  return `${actor} changed its routing state.`;
};

const getRouteChange = (event: SimulationEvent): RoutingTableChangeDetails | null => {
  if (
    event.type !== SimulationEventType.RoutingTableInsert &&
    event.type !== SimulationEventType.RoutingTableUpdate &&
    event.type !== SimulationEventType.RoutingTableRemove
  ) {
    return null;
  }

  return event.details as RoutingTableChangeDetails;
};

const getRouteRows = (details: RoutingTableChangeDetails): BatmanRouteRecord[] => {
  if (details.nextRoute) {
    return [details.nextRoute];
  }

  return details.previousRoute ? [details.previousRoute] : [];
};

const getMessageSummary = (
  event: SimulationEvent,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
): Array<{ label: string; value: ReactNode }> | null => {
  const message = getEventMessage(event);
  if (!message) {
    return null;
  }

  if (message.kind === SimulationMessageKind.Packet) {
    return [
      {
        label: "Source",
        value: message.sourcePeerId
          ? renderPeerName(
              message.sourcePeerId,
              getPeerLabel(message.sourcePeerId, peerNameById),
              onPeerHoverChange,
            )
          : "Unknown",
      },
      {
        label: "Destination",
        value: renderPeerName(
          message.destinationPeerId,
          getPeerLabel(message.destinationPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: "Type",
        value: "Packet",
      },
      {
        label: "TTL",
        value: String(message.timeToLive),
      },
    ];
  }

  return [
    {
      label: "Originator",
      value: renderPeerName(
        message.sourcePeerId,
        getPeerLabel(message.sourcePeerId, peerNameById),
        onPeerHoverChange,
      ),
    },
    {
      label: "Sender",
      value: renderPeerName(
        message.senderPeerId,
        getPeerLabel(message.senderPeerId, peerNameById),
        onPeerHoverChange,
      ),
    },
    {
      label: "Sequence",
      value: String(message.sequence),
    },
    {
      label: "Type",
      value: "OGM",
    },
    {
      label: "TTL",
      value: String(message.timeToLive),
    },
  ];
};

const getEventMessage = (event: SimulationEvent): SimulationMessage | null => {
  if (!("message" in event.details)) {
    return null;
  }

  return event.details.message as SimulationMessage;
};

const getBroadcastTitle = (event: SimulationEvent, message: SimulationMessage | null) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return "retransmit" in event.details && event.details.retransmit
      ? "OGM Broadcast Retransmission"
      : "OGM Broadcast";
  }

  return "Broadcast Message";
};

const getDroppedTitle = (message: SimulationMessage | null) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return "OGM Dropped";
  }

  if (message?.kind === SimulationMessageKind.Packet) {
    return "Packet Dropped";
  }

  return "Drop Message";
};

const getBroadcastDescription = (
  actorId: string,
  actor: string,
  event: SimulationEvent,
  message: SimulationMessage | null,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    const originator = getPeerLabel(message.sourcePeerId, peerNameById);
    const sender = getPeerLabel(message.senderPeerId, peerNameById);
    if ("retransmit" in event.details && event.details.retransmit) {
      return (
        <>
          {renderPeerName(actorId, actor, onPeerHoverChange)} rebroadcasts{" "}
          {renderPeerName(message.sourcePeerId, originator, onPeerHoverChange)}'s OGM after
          receiving it from {renderPeerName(message.senderPeerId, sender, onPeerHoverChange)}. This
          forwards fresh link-quality evidence deeper into the mesh so downstream nodes can compare
          candidate next hops for the same originator without hearing the originator directly.
        </>
      );
    }

    return (
      <>
        Every OGM interval, {renderPeerName(actorId, actor, onPeerHoverChange)} broadcasts an
        Originator Message (OGM) to announce its presence and publish fresh link-quality
        information. Neighbours rebroadcast the OGM across the mesh, allowing BATMAN nodes to
        compare received OGM counts and pick the strongest next hop back toward{" "}
        {renderPeerName(message.sourcePeerId, originator, onPeerHoverChange)}.
      </>
    );
  }

  return (
    <>
      {renderPeerName(actorId, actor, onPeerHoverChange)} broadcast a message to neighbouring peers.
    </>
  );
};

const getDroppedDescription = (
  actorId: string,
  actor: string,
  message: SimulationMessage | null,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return (
      <>
        {renderPeerName(actorId, actor, onPeerHoverChange)} could not continue processing this OGM,
        so the BATMAN propagation stopped at this hop.
      </>
    );
  }

  if (message?.kind === SimulationMessageKind.Packet) {
    return (
      <>
        {renderPeerName(actorId, actor, onPeerHoverChange)} could not forward this packet, so
        delivery stopped at this hop.
      </>
    );
  }

  return (
    <>{renderPeerName(actorId, actor, onPeerHoverChange)} dropped a message during processing.</>
  );
};

const getRouteInsertTitle = (
  message: SimulationMessage | null,
  routeChange: RoutingTableChangeDetails | null,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage || routeChange) {
    return "Originator Added";
  }

  return "Route Added";
};

const getRouteUpdateTitle = (
  message: SimulationMessage | null,
  routeChange: RoutingTableChangeDetails | null,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage || routeChange) {
    return "Originator Updated";
  }

  return "Route Updated";
};

const getRouteRemoveTitle = (
  message: SimulationMessage | null,
  routeChange: RoutingTableChangeDetails | null,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage || routeChange) {
    return "Originator Removed";
  }

  return "Route Removed";
};

const getRouteInsertDescription = (
  actorId: string,
  actor: string,
  routeChange: RoutingTableChangeDetails,
  _message: SimulationMessage | null,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const originator = getPeerLabel(routeChange.originatorPeerId, peerNameById);
  const nextHop = getPeerLabel(routeChange.hopPeerId, peerNameById);

  return (
    <>
      {renderPeerName(actorId, actor, onPeerHoverChange)} created a new originator-table entry for{" "}
      {renderPeerName(routeChange.originatorPeerId, originator, onPeerHoverChange)} via{" "}
      {renderPeerName(routeChange.hopPeerId, nextHop, onPeerHoverChange)} after accepting a valid
      OGM. The node records the originator identifier, the forwarding neighbour, and fresh last-seen
      timing data so it can initialize tracking for that originator in the BATMAN originator table.
    </>
  );
};

const getRouteUpdateDescription = (
  actorId: string,
  actor: string,
  routeChange: RoutingTableChangeDetails,
  _message: SimulationMessage | null,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const originator = getPeerLabel(routeChange.originatorPeerId, peerNameById);
  const nextHop = getPeerLabel(routeChange.hopPeerId, peerNameById);

  return (
    <>
      {renderPeerName(actorId, actor, onPeerHoverChange)} refreshed the originator-table entry for{" "}
      {renderPeerName(routeChange.originatorPeerId, originator, onPeerHoverChange)} via{" "}
      {renderPeerName(routeChange.hopPeerId, nextHop, onPeerHoverChange)} after processing a valid
      OGM for that originator. BATMAN updates the existing entry with the latest sequence progress,
      refreshes the quality window, and stores new last-seen timing information so the routing data
      stays current.
    </>
  );
};

const getRouteTqExplanation = (event: SimulationEvent) => {
  const routeChange = getRouteChange(event);
  if (!routeChange) {
    return null;
  }

  const message = getEventMessage(event);

  if (event.type === SimulationEventType.RoutingTableInsert) {
    const nextRoute = routeChange.nextRoute;
    if (!nextRoute || message?.kind !== SimulationMessageKind.BatmanOriginatorMessage) {
      return "Transaction Quality (TQ) is initialized from the first accepted OGM and then continuously adjusted as the 64-bit history window shifts, adding 1s for received OGMs and 0s for missed ones.";
    }

    return `Received OGM with sequence ${message.sequence} initializes the window: BATMAN inserts a 1 at the newest position and shifts other elements. The window was just initialized and currently has ${countQualityWindowOnes(nextRoute.qualityWindow)} successful receptions, resulting in TQ ${nextRoute.quality}.`;
  }

  if (event.type === SimulationEventType.RoutingTableUpdate) {
    const previousRoute = routeChange.previousRoute;
    const nextRoute = routeChange.nextRoute;

    if (!previousRoute || !nextRoute) {
      return null;
    }

    const isDecayUpdate = routeChange.reason.includes("no OGM was received during the tick");

    if (!isDecayUpdate) {
      if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
        return `Received OGM with sequence ${message.sequence} updated the window by adding a new entry to the first position. The calculated quality changed from ${previousRoute.quality} to ${nextRoute.quality}.`;
      }

      return `A new OGM updated the route: the window changed from ${countQualityWindowOnes(previousRoute.qualityWindow)} (TQ ${previousRoute.quality}) to ${countQualityWindowOnes(nextRoute.qualityWindow)} (TQ ${nextRoute.quality}).`;
    }

    return `No OGM arrived, so BATMAN shifted in a 0: the window changed from ${countQualityWindowOnes(previousRoute.qualityWindow)} (TQ ${previousRoute.quality}) to ${countQualityWindowOnes(nextRoute.qualityWindow)} (TQ ${nextRoute.quality}).`;
  }

  return null;
};

const countQualityWindowOnes = (qualityWindow: string) => {
  return qualityWindow.split("").reduce((count, bit) => count + Number(bit === "1"), 0);
};

const getRouteTqQuestion = (event: SimulationEvent) => {
  if (event.type === SimulationEventType.RoutingTableUpdate) {
    return "How Transaction Quality (TQ) changed?";
  }

  return "What is Transaction Quality (TQ)?";
};

const getRouteRemoveDescription = (
  actorId: string,
  actor: string,
  routeChange: RoutingTableChangeDetails,
  _message: SimulationMessage | null,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const originator = getPeerLabel(routeChange.originatorPeerId, peerNameById);
  const nextHop = getPeerLabel(routeChange.hopPeerId, peerNameById);

  return (
    <>
      {renderPeerName(actorId, actor, onPeerHoverChange)} removed the originator-table entry for{" "}
      {renderPeerName(routeChange.originatorPeerId, originator, onPeerHoverChange)} via{" "}
      {renderPeerName(routeChange.hopPeerId, nextHop, onPeerHoverChange)}. BATMAN drops the record
      when the quality window decays or the route becomes stale, so this next hop is no longer
      trusted as a valid path to that originator.
    </>
  );
};

const renderPeerName = (
  peerId: string,
  peerName: string,
  onPeerHoverChange: (peerId: string | null) => void,
): ReactNode => {
  return (
    <span
      className="simulation-panel__peer-name"
      onMouseEnter={() => onPeerHoverChange(peerId)}
      onMouseLeave={() => onPeerHoverChange(null)}
    >
      {peerName}
    </span>
  );
};

const getPeerLabel = (peerId: string, peerNameById: Map<string, string>) => {
  return peerNameById.get(peerId) ?? peerId;
};
