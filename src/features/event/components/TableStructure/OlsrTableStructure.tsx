import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import type { OlsrPeerTables } from "@/features/processor/types/peerTables";
import { OlsrNeighbourStatus } from "@/features/processor/types/protocols/olsr.ts";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import { useState } from "react";
import TableGroup from "./TableGroup";

type OlsrTableStructureProps = {
  tables: OlsrPeerTables;
  peers: PeerEntity[];
  onPeerNameHover: (peerId: UUID) => void;
};

const EMPTY_ONE = [["-"]];
const EMPTY_TWO = [["-", "-"]];
const EMPTY_THREE = [["-", "-", "-"]];
const EMPTY_FOUR = [["-", "-", "-", "-"]];
const EMPTY_FIVE = [["-", "-", "-", "-", "-"]];

export default function OlsrTableStructure({
  tables,
  peers,
  onPeerNameHover,
}: OlsrTableStructureProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    neighbours: true,
    twoHop: false,
    mpr: false,
    selectors: false,
    topology: false,
    routes: false,
  });

  const neighbourRows = tables.neighbourSet.map((row) => [
    <PeerDescription
      peer={findById(row.neighbourPeerId, peers)}
      onHover={() => onPeerNameHover(row.neighbourPeerId)}
    />,
    row.status === OlsrNeighbourStatus.Symmetric ? "SYM" : "MPR",
    row.lastUpdateTick,
  ]);

  const twoHopRows = tables.twoHopNeighbourSet.map((row) => [
    <PeerDescription
      peer={findById(row.viaPeerId, peers)}
      onHover={() => onPeerNameHover(row.viaPeerId)}
    />,
    <PeerDescription
      peer={findById(row.destinationPeerId, peers)}
      onHover={() => onPeerNameHover(row.destinationPeerId)}
    />,
    row.lastUpdateTick,
  ]);

  const mprRows = tables.mprSet.map((row) => [
    <PeerDescription peer={findById(row, peers)} onHover={() => onPeerNameHover(row)} />,
  ]);

  const selectorRows = tables.selectorSet.map((row) => [
    <PeerDescription
      peer={findById(row.selectorPeerId, peers)}
      onHover={() => onPeerNameHover(row.selectorPeerId)}
    />,
    row.lastUpdateTick,
  ]);

  const topologyRows = tables.topologySet.map((row) => [
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

  const routeRows = tables.routingTable.map((row) => [
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
          headers={["Address", "Status", "Last Seen"]}
          rows={neighbourRows.length > 0 ? neighbourRows : EMPTY_THREE}
        />
      </TableGroup>

      <TableGroup
        name="Two-Hop Neighbor Set"
        isOpen={collapsedSections.twoHop}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            twoHop: !current.twoHop,
          }));
        }}
      >
        <TableDescription
          headers={["Address", "Two-Hop Address", "Last Update"]}
          rows={twoHopRows.length > 0 ? twoHopRows : EMPTY_THREE}
        />
      </TableGroup>

      <TableGroup
        name="Multipount Relay Set"
        isOpen={collapsedSections.mpr}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            mpr: !current.mpr,
          }));
        }}
      >
        <TableDescription headers={["Neighbour"]} rows={mprRows.length > 0 ? mprRows : EMPTY_ONE} />
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
        name="Topology Set"
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
