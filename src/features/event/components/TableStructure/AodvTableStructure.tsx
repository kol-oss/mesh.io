import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import type { PeerSnapshot } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import { useState } from "react";
import TableGroup from "./TableGroup";

type AodvTableStructureProps = {
  peer: PeerSnapshot;
  peers: PeerEntity[];
  onPeerNameHover: (peerId: UUID) => void;
};

const EMPTY_ROW = [["—", "—", "—", "—", "—", "—"]];

const renderPrecursors = (
  precursorIds: UUID[],
  peers: PeerEntity[],
  onPeerNameHover: (peerId: UUID) => void,
) => {
  if (precursorIds.length === 0) {
    return "—";
  }

  return precursorIds.map((peerId, index) => (
    <span key={`aodv-precursor-${peerId}`}>
      <PeerDescription peer={findById(peerId, peers)} onHover={() => onPeerNameHover(peerId)} />
      {index < precursorIds.length - 1 ? ", " : ""}
    </span>
  ));
};

export default function AodvTableStructure({
  peer,
  peers,
  onPeerNameHover,
}: AodvTableStructureProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    routes: true,
  });

  const routeRows = peer.aodvRoutingTable.map((route) => [
    <PeerDescription
      peer={findById(route.destinationId, peers)}
      onHover={() => onPeerNameHover(route.destinationId)}
    />,
    <PeerDescription
      peer={findById(route.nextHopId, peers)}
      onHover={() => onPeerNameHover(route.nextHopId)}
    />,
    route.hopCount,
    route.sequence,
    renderPrecursors(route.precursors, peers, onPeerNameHover),
    route.lastUpdateTick,
  ]);

  return (
    <TableGroup
      name="AODV Routing Table"
      isOpen={collapsedSections.routes}
      onToggle={() => {
        setCollapsedSections((current) => ({
          ...current,
          routes: !current.routes,
        }));
      }}
    >
      <TableDescription
        headers={["Destination", "Next Hop", "Metric", "Sequence", "Precursors", "Last Update"]}
        rows={routeRows.length > 0 ? routeRows : EMPTY_ROW}
      />
    </TableGroup>
  );
}
