import PeerDescription from "@/features/event/components/Description/PeerDescription.tsx";
import TableDescription from "@/features/event/components/Description/TableDescription.tsx";
import TableGroup from "@/features/event/components/TableStructure/TableGroup.tsx";
import type { DsrPeerTables } from "@/features/processor/types/peerTables.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import type { PeerEntity } from "@/shared/types/model/peers.ts";
import { findById } from "@/shared/utils/peers.ts";
import { useState } from "react";

type DsrTableStructureProps = {
  tables: DsrPeerTables;
  peerId: UUID;
  peers: PeerEntity[];
  onPeerNameHover: (peerId: UUID) => void;
};

const EMPTY_ROW = [["—", "—", "—"]];

export default function DsrTableStructure({
  tables,
  peerId,
  peers,
  onPeerNameHover,
}: DsrTableStructureProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    cache: true,
    requestTable: false,
  });

  const getPathString = (path: UUID[]) =>
    path.map((id) => findById(id, peers)?.name ?? id).join(" -> ");

  const { routingCache: cache, routeRequestTable: requestTable } = tables;
  const cacheRows = cache.map((record) => [
    <PeerDescription
      peer={findById(record.destinationId, peers)}
      onHover={() => onPeerNameHover(record.destinationId)}
    />,
    getPathString([peerId, ...record.path, record.destinationId]),
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
