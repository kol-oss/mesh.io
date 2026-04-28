import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

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
  onPeerHoverChange: (peerId: string | null) => void;
  onNextEvent: () => void;
  onPrevEvent: () => void;
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
  onPeerHoverChange,
  onNextEvent,
  onPrevEvent,
}: SimulationPanelProps) {
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
  const messageSummary = routeChange ? null : getMessageSummary(currentEvent, peerNameById);
  const handlePointerDownCapture = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <aside
      className="simulation-panel simulation-panel--tooltip"
      aria-label="Simulation event"
      onPointerDownCapture={handlePointerDownCapture}
      onMouseLeave={() => onPeerHoverChange(null)}
      style={{ left: `${anchorX}px`, top: `${anchorY}px` }}
    >
      <header className="simulation-panel__header">
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
                  <th>Window</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {routeRows.map((row, index) => (
                  <tr key={`${row.originatorPeerId}-${row.hopPeerId}-${index}`}>
                    <td>{getPeerLabel(row.originatorPeerId, peerNameById)}</td>
                    <td>{getPeerLabel(row.hopPeerId, peerNameById)}</td>
                    <td>{row.quality}</td>
                    <td>{row.qualityWindow}</td>
                    <td>{row.lastTick}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : messageSummary ? (
          <div className="simulation-panel__table-block">
            <dl className="simulation-panel__message-block">
              {messageSummary.map((item) => (
                <div className="simulation-panel__message-row" key={item.label}>
                  <dt className="simulation-panel__message-key">{item.label}</dt>
                  <dd className="simulation-panel__message-value">{item.value}</dd>
                </div>
              ))}
            </dl>
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
): Array<{ label: string; value: string }> | null => {
  const message = getEventMessage(event);
  if (!message) {
    return null;
  }

  if (message.kind === SimulationMessageKind.Packet) {
    return [
      {
        label: "Source",
        value: message.sourcePeerId ? getPeerLabel(message.sourcePeerId, peerNameById) : "Unknown",
      },
      {
        label: "Destination",
        value: getPeerLabel(message.destinationPeerId, peerNameById),
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
      value: getPeerLabel(message.sourcePeerId, peerNameById),
    },
    {
      label: "Sender",
      value: getPeerLabel(message.senderPeerId, peerNameById),
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
