import PacketStructureWindow from "@/features/simulation/components/PacketStructureWindow/PacketStructureWindow";
import TableInspectionWindow from "@/features/simulation/components/TableInspectionWindow/TableInspectionWindow";
import type { UUID } from "@/shared/types/common/uuid";
import type { Event } from "@/shared/types/processor/events";
import type { StepResult } from "@/shared/types/processor/simulation";

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

type Props = {
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

export default function InspectionWindows({
  packetInspectorWindows,
  tableInspectionWindows,
  simulationMessageHoverState,
  currentStepId,
  currentSimulationStepResult,
  currentSimulationEvent,
  onPacketInspectorClose,
  onTableInspectionClose,
  onSimulationPeerHoverChange,
}: Props) {
  return (
    <>
      {packetInspectorWindows.map((windowState) => {
        const event =
          currentSimulationStepResult?.events.find((e) => e.id === windowState.eventId) ?? null;
        const shouldRender =
          !!event &&
          windowState.isOpen &&
          (windowState.pinned ||
            (simulationMessageHoverState.eventId === windowState.eventId &&
              simulationMessageHoverState.isHovered));

        return (
          shouldRender && (
            <PacketStructureWindow
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
        const shouldRender =
          windowState.isOpen && (windowState.pinned || windowState.stepId === currentStepId);

        return (
          shouldRender && (
            <TableInspectionWindow
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
