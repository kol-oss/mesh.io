import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import type { PeerSnapshot } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import { useState } from "react";
import TableGroup from "./TableGroup";

type OlsrTableStructureProps = {
  peer: PeerSnapshot;
  peers: PeerEntity[];
  onPeerNameHover: (peerId: UUID) => void;
};

const EMPTY_THREE = [["-", "-", "-"]];
const EMPTY_TWO = [["-", "-"]];
const EMPTY_FOUR = [["-", "-", "-", "-"]];
const EMPTY_FIVE = [["-", "-", "-", "-", "-"]];

export default function OlsrTableStructure({
  peer,
  peers,
  onPeerNameHover,
}: OlsrTableStructureProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    neighbours: true,
    twoHop: false,
    selectors: false,
    topology: false,
    routes: false,
  });

  const neighbourRows = peer.olsrNeighbourTable.map((row) => [
    <PeerDescription
      peer={findById(row.neighbourPeerId, peers)}
      onHover={() => onPeerNameHover(row.neighbourPeerId)}
    />,
    row.status,
    row.lastUpdateTick,
  ]);

  const twoHopRows = peer.olsrTwoHopTable.map((row) => [
    <PeerDescription
      peer={findById(row.destinationPeerId, peers)}
      onHover={() => onPeerNameHover(row.destinationPeerId)}
    />,
    <PeerDescription
      peer={findById(row.viaPeerId, peers)}
      onHover={() => onPeerNameHover(row.viaPeerId)}
    />,
    row.lastUpdateTick,
  ]);

  const selectorRows = peer.olsrSelectorTable.map((row) => [
    <PeerDescription
      peer={findById(row.selectorPeerId, peers)}
      onHover={() => onPeerNameHover(row.selectorPeerId)}
    />,
    row.lastUpdateTick,
  ]);

  const topologyRows = peer.olsrTopologyTable.map((row) => [
    <PeerDescription
      peer={findById(row.destinationPeerId, peers)}
      onHover={() => onPeerNameHover(row.destinationPeerId)}
    />,
    <PeerDescription
      peer={findById(row.lastHopPeerId, peers)}
      onHover={() => onPeerNameHover(row.lastHopPeerId)}
    />,
    row.sequenceNumber,
    row.lastUpdateTick,
  ]);

  const routeRows = peer.olsrRoutingTable.map((row) => [
    <PeerDescription
      peer={findById(row.destinationPeerId, peers)}
      onHover={() => onPeerNameHover(row.destinationPeerId)}
    />,
    <PeerDescription
      peer={findById(row.nextHopPeerId, peers)}
      onHover={() => onPeerNameHover(row.nextHopPeerId)}
    />,
    row.metric,
    row.sequenceNumber,
    row.lastUpdateTick,
  ]);

  return (
    <>
      <TableGroup
        name="Neighbour Set"
        isOpen={collapsedSections.neighbours}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            neighbours: !current.neighbours,
          }));
        }}
      >
        <TableDescription
          headers={["Neighbour", "Status", "Last Seen"]}
          rows={neighbourRows.length > 0 ? neighbourRows : EMPTY_THREE}
        />
      </TableGroup>

      <TableGroup
        name="2-Hop Neighbor Set"
        isOpen={collapsedSections.twoHop}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            twoHop: !current.twoHop,
          }));
        }}
      >
        <TableDescription
          headers={["Destination", "Via", "Last Update"]}
          rows={twoHopRows.length > 0 ? twoHopRows : EMPTY_THREE}
        />
      </TableGroup>

      <TableGroup
        name="MPR Selector Set"
        isOpen={collapsedSections.selectors}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            selectors: !current.selectors,
          }));
        }}
      >
        <TableDescription
          headers={["Selector", "Last Update"]}
          rows={selectorRows.length > 0 ? selectorRows : EMPTY_TWO}
        />
      </TableGroup>

      <TableGroup
        name="Topology Table"
        isOpen={collapsedSections.topology}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            topology: !current.topology,
          }));
        }}
      >
        <TableDescription
          headers={["Destination", "Last Hop", "ANSN", "Last Update"]}
          rows={topologyRows.length > 0 ? topologyRows : EMPTY_FOUR}
        />
      </TableGroup>

      <TableGroup
        name="Routing Table"
        isOpen={collapsedSections.routes}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            routes: !current.routes,
          }));
        }}
      >
        <TableDescription
          headers={["Destination", "Next Hop", "Metric", "ANSN", "Last Update"]}
          rows={routeRows.length > 0 ? routeRows : EMPTY_FIVE}
        />
      </TableGroup>
    </>
  );
}
