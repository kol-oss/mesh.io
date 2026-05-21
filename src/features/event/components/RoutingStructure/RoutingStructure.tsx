import type { Event } from "@/shared/types/common/events";
import type { StepResult } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import MessageStructure from "../MessageStructure/MessageStructure";
import TableStructure from "../TableStructure/TableStructure";

type PacketInspectorWindowState = {
  eventId: UUID;
  isOpen: boolean;
  pinned: boolean;
};

type TableInspectionWindowState = {
  peerId: UUID;
  pinned: boolean;
  isOpen: boolean;
  stepId: UUID | null;
};

type RoutingStructureProps = {
  packetInspectorWindows: PacketInspectorWindowState[];
  tableInspectionWindows: TableInspectionWindowState[];
  simulationMessageHoverState: { eventId: UUID | null; isHovered: boolean };
  currentStepId: UUID | null;
  currentSimulationStepResult: StepResult | null;
  currentSimulationEvent: Event | null;
  onPacketInspectorClose: (eventId: UUID) => void;
  onTableInspectionClose: (peerId: UUID) => void;
  onSimulationPeerHoverChange: (peerId: UUID | null) => void;
};

export default function RoutingStructure({
  packetInspectorWindows,
  tableInspectionWindows,
  simulationMessageHoverState,
  currentStepId,
  currentSimulationStepResult,
  currentSimulationEvent,
  onPacketInspectorClose,
  onTableInspectionClose,
  onSimulationPeerHoverChange,
}: RoutingStructureProps) {
  return (
    <>
      {packetInspectorWindows.map((windowState) => {
        const event =
          currentSimulationStepResult?.events.find((e) => e.id === windowState.eventId) ?? null;
        const isHoveredWindow =
          simulationMessageHoverState.eventId === windowState.eventId &&
          simulationMessageHoverState.isHovered;

        const shouldRender =
          !!event && windowState.isOpen && (windowState.pinned || isHoveredWindow);

        return (
          shouldRender && (
            <MessageStructure
              key={`packet-window-${windowState.eventId}`}
              isOpen={true}
              currentEvent={event}
              currentStepResult={currentSimulationStepResult}
              onClose={() => onPacketInspectorClose(windowState.eventId)}
            />
          )
        );
      })}

      {tableInspectionWindows.map((windowState) => {
        const isCurrentStep = windowState.stepId === currentStepId;
        const shouldRender = windowState.isOpen && (windowState.pinned || isCurrentStep);

        return (
          shouldRender && (
            <TableStructure
              key={`table-window-${windowState.peerId}`}
              isOpen={true}
              currentStepResult={currentSimulationStepResult}
              currentEventId={currentSimulationEvent?.id ?? null}
              inspectedPeerId={windowState.peerId}
              onClose={() => onTableInspectionClose(windowState.peerId)}
              onPeerHoverChange={onSimulationPeerHoverChange}
            />
          )
        );
      })}
    </>
  );
}
