import { ExternalLink, X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { ui } from "../../i18n/messages";
import type { SimulationStepResult } from "../../types/simulation";

type TableInspectionWindowProps = {
  isOpen: boolean;
  currentStepResult: SimulationStepResult | null;
  currentEventId: string | null;
  inspectedPeerId: string | null;
  onClose: () => void;
  onPeerHoverChange: (peerId: string | null) => void;
};

export default function TableInspectionWindow({
  isOpen,
  currentStepResult,
  currentEventId,
  inspectedPeerId,
  onClose,
  onPeerHoverChange,
}: TableInspectionWindowProps) {
  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  if (!isOpen || !currentStepResult || !inspectedPeerId) {
    return null;
  }

  const eventIndex = currentEventId
    ? currentStepResult.events.findIndex((event) => event.id === currentEventId)
    : -1;
  const snapshotForEvent =
    eventIndex >= 0 ? (currentStepResult.eventSnapshots[eventIndex] ?? null) : null;
  const inspectedSnapshot = snapshotForEvent ?? currentStepResult.snapshot;

  const peerNameById = new Map(inspectedSnapshot.peers.map((peer) => [peer.id, peer.name]));
  const inspectedPeer = inspectedSnapshot.peers.find((peer) => peer.id === inspectedPeerId);

  if (!inspectedPeer) {
    return null;
  }

  return (
    <aside
      className="simulation-panel simulation-panel--inspector"
      aria-label={ui.simulation.panelAria}
      onPointerDown={handlePointerDown}
    >
      <header className="simulation-panel__header simulation-panel__header--static">
        <h2 className="simulation-panel__title">
          {ui.simulation.tableInspectionTitle(inspectedPeer.name)}
        </h2>
        <button
          className="simulation-panel__close-button"
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={ui.packet.closeAria}
        >
          <X size={14} />
        </button>
      </header>

      <section className="simulation-panel__section" onMouseLeave={() => onPeerHoverChange(null)}>
        <div className="simulation-panel__table-block">
          <p className="simulation-panel__section-title">{ui.simulation.tableNeighbours}</p>
          <table className="simulation-panel__table-view">
            <thead>
              <tr>
                <th>{ui.simulation.tableNeighbour}</th>
                <th>{ui.simulation.tableTq}</th>
                <th>{ui.simulation.tableLastSeen}</th>
                <th>{ui.simulation.summaryInterval}</th>
              </tr>
            </thead>
            <tbody>
              {inspectedPeer.neighboursTable.length === 0 ? (
                <tr>
                  <td colSpan={4}>{ui.simulation.tableNoRecords}</td>
                </tr>
              ) : (
                inspectedPeer.neighboursTable.map((row, index) => (
                  <tr key={`${row.neighbourPeerId}-${index}`}>
                    <td>
                      {renderPeerName(
                        row.neighbourPeerId,
                        getPeerLabel(row.neighbourPeerId, peerNameById),
                        onPeerHoverChange,
                      )}
                    </td>
                    <td>{row.quality}</td>
                    <td>{row.lastTick}</td>
                    <td>{row.interval}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="simulation-panel__table-block">
          <p className="simulation-panel__section-title">{ui.simulation.tableOriginators}</p>
          <table className="simulation-panel__table-view">
            <thead>
              <tr>
                <th>{ui.simulation.tableOriginator}</th>
                <th>{ui.simulation.tableNextHop}</th>
                <th>{ui.simulation.tableTq}</th>
                <th>{ui.simulation.tableLastSeen}</th>
              </tr>
            </thead>
            <tbody>
              {inspectedPeer.routingTable.length === 0 ? (
                <tr>
                  <td colSpan={4}>{ui.simulation.tableNoRecords}</td>
                </tr>
              ) : (
                inspectedPeer.routingTable.map((row, index) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="simulation-panel__footer">
        <button className="simulation-panel__read-more" type="button">
          <ExternalLink size={12} />
          {ui.simulation.packetStructureReadMore}
        </button>
      </footer>
    </aside>
  );
}

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
