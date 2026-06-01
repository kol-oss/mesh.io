import type { PeerSnapshot } from "@/shared/types/common/simulation.ts";
import type { PeerEntity } from "@/shared/types/model/peers.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import { useState } from "react";
import TableGroup from "@/features/event/components/TableStructure/TableGroup.tsx";
import TableDescription from "@/features/event/components/Description/TableDescription.tsx";
import PeerDescription from "@/features/event/components/Description/PeerDescription.tsx";
import { findById } from "@/shared/utils/peers.ts";

type DsrTableStructureProps = {
  peer: PeerSnapshot;
  peers: PeerEntity[];
  onPeerNameHover: (peerId: UUID) => void;
};

const EMPTY_ROW = [["—", "—", "—"]];

export default function DsrTableStructure({
  peer,
  peers,
  onPeerNameHover,
}: DsrTableStructureProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    cache: true,
    requestTable: false,
  });

  const getPathString = (path: UUID[]) =>
    path.map((peerId) => findById(peerId, peers)?.name ?? peerId).join(" -> ");

  const { dsrRoutingTable: cache, dsrRouteRequestTable: requestTable } = peer;
  const cacheRows = cache.map((record) => [
    <PeerDescription
      peer={findById(record.destinationId, peers)}
      onHover={() => onPeerNameHover(record.destinationId)}
    />,
    getPathString([peer.id, ...record.path, record.destinationId]),
    record.lastUpdateTick,
  ]);

  const tableRows = requestTable.map((record) => [
    <PeerDescription
      peer={findById(record.destinationId, peers)}
      onHover={() => onPeerNameHover(record.destinationId)}
    />,
    <PeerDescription
      peer={findById(record.sourceId, peers)}
      onHover={() => onPeerNameHover(record.sourceId)}
    />,
    record.identification,
  ]);

  return (
    <>
      <TableGroup
        name="Route Cache"
        isOpen={collapsedSections.cache}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            cache: !current.cache,
          }));
        }}
      >
        <TableDescription
          headers={["Destination", "Path", "Last Seen"]}
          rows={cacheRows.length > 0 ? cacheRows : EMPTY_ROW}
        />
      </TableGroup>
      <TableGroup
        name="Request Table"
        isOpen={collapsedSections.requestTable}
        onToggle={() => {
          setCollapsedSections((current) => ({
            ...current,
            requestTable: !current.requestTable,
          }));
        }}
      >
        <TableDescription
          headers={["Destination", "Source", "Identification"]}
          rows={tableRows.length > 0 ? tableRows : EMPTY_ROW}
        />
      </TableGroup>
    </>
  );
}
