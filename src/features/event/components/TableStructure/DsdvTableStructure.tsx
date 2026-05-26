import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import type { PeerSnapshot } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import { useState } from "react";
import TableGroup from "./TableGroup";

type DsdvTableStructureProps = {
  peer: PeerSnapshot;
  peers: PeerEntity[];
  onPeerNameHover: (peerId: UUID) => void;
};

const EMPTY_ROW = [["-", "-", "-", "-", "-"]];

export default function DsdvTableStructure({
  peer,
  peers,
  onPeerNameHover,
}: DsdvTableStructureProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    routes: true,
  });

  const routeRows = peer.dsdvRoutingTable.map((route) => [
    <PeerDescription
      peer={findById(route.destinationPeerId, peers)}
      onHover={() => onPeerNameHover(route.destinationPeerId)}
    />,
    <PeerDescription
      peer={findById(route.nextHopPeerId, peers)}
      onHover={() => onPeerNameHover(route.nextHopPeerId)}
    />,
    route.metric,
    route.sequenceNumber,
    route.lastUpdateTick,
  ]);

  return (
    <TableGroup
      name="DSDV Routing Table"
      isOpen={collapsedSections.routes}
      onToggle={() => {
        setCollapsedSections((current) => ({
          ...current,
          routes: !current.routes,
        }));
      }}
    >
      <TableDescription
        headers={["Destination", "Next Hop", "Metric", "Sequence", "Last Update"]}
        rows={routeRows.length > 0 ? routeRows : EMPTY_ROW}
      />
    </TableGroup>
  );
}
