import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import type { PeerSnapshot } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import { useState } from "react";
import TableGroup from "./TableGroup";

type BatmanTableStructureProps = {
  peer: PeerSnapshot;
  peers: PeerEntity[];
  onPeerNameHover: (peerId: UUID) => void;
};

const EMPTY_ROW = [["—", "—", "—", "—"]];

export default function BatmanTableStructure({
  peer,
  peers,
  onPeerNameHover,
}: BatmanTableStructureProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    neighbours: true,
    originators: true,
  });

  const { batmanNeighboursTable: neighbours, batmanRoutingTable: originators } = peer;
  const neighbourRows = neighbours.map((neighbour) => [
    <PeerDescription
      peer={findById(neighbour.neighbourId, peers)}
      onHover={() => onPeerNameHover(neighbour.neighbourId)}
    />,
    neighbour.throughput,
    neighbour.lastTick,
    neighbour.interval,
  ]);

  const originatorRows = originators.map((originator) => [
    <PeerDescription
      peer={findById(originator.originatorId, peers)}
      onHover={() => onPeerNameHover(originator.originatorId)}
    />,
    <PeerDescription
      peer={findById(originator.hopId, peers)}
      onHover={() => onPeerNameHover(originator.hopId)}
    />,
    originator.throughput,
    originator.lastTick,
  ]);

  return (
    <>
      <TableGroup
        name="Neighbours List"
        isOpen={collapsedSections.neighbours}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            neighbours: !current.neighbours,
          }));
        }}
      >
        <TableDescription
          headers={["Neighbour", "Throughput", "Last Seen", "Interval"]}
          rows={neighbourRows.length > 0 ? neighbourRows : EMPTY_ROW}
        />
      </TableGroup>
      <TableGroup
        name="Originators Table"
        isOpen={collapsedSections.originators}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            originators: !current.originators,
          }));
        }}
      >
        <TableDescription
          headers={["Originator", "Next Hop", "Throughput", "Last Seen"]}
          rows={originatorRows.length > 0 ? originatorRows : EMPTY_ROW}
        />
      </TableGroup>
    </>
  );
}
