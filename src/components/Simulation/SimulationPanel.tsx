import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { ToolbarMode } from "../../types/enums";
import {
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
  const description = getEventDescription(currentEvent, inspectionMode, peerNameById);
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
            <p className="simulation-panel__table-label">{getRouteTableLabel(currentEvent.type)}</p>
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
            <p className="simulation-panel__reason">{routeChange.reason}</p>
          </div>
        ) : messageSummary ? (
          <dl className="simulation-panel__message-block">
            {messageSummary.map((item) => (
              <div className="simulation-panel__message-row" key={item.label}>
                <dt className="simulation-panel__message-key">{item.label}</dt>
                <dd className="simulation-panel__message-value">{item.value}</dd>
              </div>
            ))}
          </dl>
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
  switch (event.type) {
    case SimulationEventType.RoutingTableInsert:
      return "Add New Route";
    case SimulationEventType.RoutingTableUpdate:
      return "Update Route";
    case SimulationEventType.RoutingTableRemove:
      return "Remove Route";
    case SimulationEventType.SystemMessageBroadcast:
      return "Broadcast Message";
    case SimulationEventType.SystemMessageSent:
      return "Send Message";
    case SimulationEventType.SystemMessageReceived:
      return "Receive Message";
    case SimulationEventType.SystemMessageDropped:
      return "Drop Message";
    default:
      return "Simulation Event";
  }
};

const getEventDescription = (
  event: SimulationEvent,
  inspectionMode: ToolbarMode,
  peerNameById: Map<string, string>,
) => {
  const actor = getPeerLabel(event.peerId, peerNameById);
  const routeChange = getRouteChange(event);

  if (routeChange) {
    const originator = getPeerLabel(routeChange.originatorPeerId, peerNameById);
    const nextHop = getPeerLabel(routeChange.hopPeerId, peerNameById);

    if (event.type === SimulationEventType.RoutingTableInsert) {
      return `${actor} added a new Originator Table record for ${originator} via ${nextHop}.`;
    }

    if (event.type === SimulationEventType.RoutingTableUpdate) {
      return `${actor} updated the Originator Table record for ${originator} via ${nextHop}. ${routeChange.reason}`;
    }

    return `${actor} removed the Originator Table record for ${originator} via ${nextHop}. ${routeChange.reason}`;
  }

  if (inspectionMode === ToolbarMode.PacketStructure) {
    switch (event.type) {
      case SimulationEventType.SystemMessageBroadcast:
        return `${actor} broadcast a message to neighbouring peers.`;
      case SimulationEventType.SystemMessageSent:
        return `${actor} sent a message to the selected next hop.`;
      case SimulationEventType.SystemMessageReceived:
        return `${actor} received a message and handled it locally.`;
      case SimulationEventType.SystemMessageDropped:
        return `${actor} dropped a message during processing.`;
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

const getRouteTableLabel = (eventType: SimulationEventType) => {
  switch (eventType) {
    case SimulationEventType.RoutingTableInsert:
      return "New record inserted into the Originator Table:";
    case SimulationEventType.RoutingTableUpdate:
      return "Record updated in the Originator Table:";
    case SimulationEventType.RoutingTableRemove:
      return "Record removed from the Originator Table:";
    default:
      return "Originator Table change:";
  }
};

const getMessageSummary = (
  event: SimulationEvent,
  peerNameById: Map<string, string>,
): Array<{ label: string; value: string }> | null => {
  if (!("message" in event.details)) {
    return null;
  }

  const message = event.details.message as SimulationMessage;
  if (message.kind === "PACKET") {
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

const getPeerLabel = (peerId: string, peerNameById: Map<string, string>) => {
  return peerNameById.get(peerId) ?? peerId;
};
