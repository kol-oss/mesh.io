import { useCallback, useRef, useState } from "react";
import { ToolbarMode } from "../../types/enums";
import type { SimulationEvent } from "../../types/simulation";

type PacketInspectorWindow = {
  eventId: string;
  isOpen: boolean;
  pinned: boolean;
};

type TableInspectionWindow = {
  peerId: string;
  pinned: boolean;
  isOpen: boolean;
  stepId: string | null;
};

type MessageHoverState = {
  eventId: string | null;
  isHovered: boolean;
};

type SimulationPeerHoverState = {
  eventId: string;
  peerId: string | null;
} | null;

type Props = {
  currentSimulationEvent: SimulationEvent | null;
  currentStepId: string | null;
  simulationInspectionMode: ToolbarMode;
  isPacketInspectionActive: boolean;
  currentSimulationEventId: string | null;
};

type Return = {
  packetInspectorWindows: PacketInspectorWindow[];
  tableInspectionWindows: TableInspectionWindow[];
  simulationMessageHoverState: MessageHoverState;
  simulationTqDisclosureByEvent: Record<string, boolean>;
  simulationSequenceDisclosureByEvent: Record<string, boolean>;
  hoveredSimulationPeerState: SimulationPeerHoverState;
  tableInspectionSuppressHoverRef: React.MutableRefObject<boolean>;
  handleSimulationPeerHoverChange: (peerId: string | null) => void;
  handleSimulationTqDisclosureToggle: (eventId: string) => void;
  handleSimulationSequenceDisclosureToggle: (eventId: string) => void;
  handleTableInspectionPeerHoverChange: (peerId: string | null) => void;
  handleTableInspectionClose: (peerId: string) => void;
  handleMessageAnimationHoverChange: (isHovered: boolean) => void;
  handleMessageAnimationInspectRequest: () => void;
  handlePacketInspectorClose: (eventId: string) => void;
  setPacketInspectorWindows: React.Dispatch<React.SetStateAction<PacketInspectorWindow[]>>;
  setTableInspectionWindows: React.Dispatch<React.SetStateAction<TableInspectionWindow[]>>;
};

export const useWorkspaceWindowStates = ({
  currentSimulationEvent,
  currentStepId,
  simulationInspectionMode,
  isPacketInspectionActive,
  currentSimulationEventId,
}: Props): Return => {
  const [packetInspectorWindows, setPacketInspectorWindows] = useState<PacketInspectorWindow[]>([]);
  const [tableInspectionWindows, setTableInspectionWindows] = useState<TableInspectionWindow[]>([]);
  const [simulationMessageHoverState, setSimulationMessageHoverState] = useState<MessageHoverState>(
    { eventId: null, isHovered: false },
  );
  const [simulationTqDisclosureByEvent, setSimulationTqDisclosureByEvent] = useState<
    Record<string, boolean>
  >({});
  const [simulationSequenceDisclosureByEvent, setSimulationSequenceDisclosureByEvent] = useState<
    Record<string, boolean>
  >({});
  const [hoveredSimulationPeerState, setHoveredSimulationPeerState] =
    useState<SimulationPeerHoverState>(null);

  const tableInspectionSuppressHoverRef = useRef(false);

  const handleSimulationPeerHoverChange = useCallback(
    (peerId: string | null) => {
      if (!currentSimulationEvent) {
        setHoveredSimulationPeerState(null);
        return;
      }

      setHoveredSimulationPeerState({
        eventId: currentSimulationEvent.id,
        peerId,
      });
    },
    [currentSimulationEvent],
  );

  const handleSimulationTqDisclosureToggle = useCallback((eventId: string) => {
    setSimulationTqDisclosureByEvent((prev) => ({
      ...prev,
      [eventId]: !(prev[eventId] ?? false),
    }));
  }, []);

  const handleSimulationSequenceDisclosureToggle = useCallback((eventId: string) => {
    setSimulationSequenceDisclosureByEvent((prev) => ({
      ...prev,
      [eventId]: !(prev[eventId] ?? false),
    }));
  }, []);

  const handleTableInspectionPeerHoverChange = useCallback(
    (peerId: string | null) => {
      if (simulationInspectionMode !== ToolbarMode.RoutingTable) {
        return;
      }

      if (peerId === null) {
        tableInspectionSuppressHoverRef.current = false;
      }

      if (tableInspectionSuppressHoverRef.current) {
        return;
      }

      setTableInspectionWindows((prev) => {
        if (peerId === null) {
          return prev.filter((w) => w.pinned);
        }

        const existing = prev.find((w) => w.peerId === peerId);
        if (existing) {
          if (existing.pinned) return prev;
          return prev.map((w) =>
            w.peerId === peerId ? { ...w, isOpen: true, stepId: currentStepId } : w,
          );
        }

        return [...prev, { peerId, pinned: false, isOpen: true, stepId: currentStepId }];
      });
    },
    [currentStepId, simulationInspectionMode],
  );

  const handleTableInspectionClose = useCallback((peerId: string) => {
    tableInspectionSuppressHoverRef.current = true;
    setTableInspectionWindows((prev) => prev.filter((w) => w.peerId !== peerId));
  }, []);

  const handleMessageAnimationHoverChange = useCallback(
    (isHovered: boolean) => {
      setSimulationMessageHoverState({
        eventId: currentSimulationEventId,
        isHovered,
      });

      if (!isPacketInspectionActive || !currentSimulationEventId) {
        return;
      }

      setPacketInspectorWindows((prev) => {
        const existing = prev.find((w) => w.eventId === currentSimulationEventId);
        if (existing) {
          if (existing.pinned) {
            return prev;
          }

          if (isHovered) {
            return prev.map((w) =>
              w.eventId === currentSimulationEventId ? { ...w, isOpen: true, pinned: false } : w,
            );
          }

          return prev.filter((w) => w.eventId !== currentSimulationEventId || w.pinned);
        }

        if (isHovered) {
          return [...prev, { eventId: currentSimulationEventId, isOpen: true, pinned: false }];
        }

        return prev;
      });
    },
    [currentSimulationEventId, isPacketInspectionActive],
  );

  const handleMessageAnimationInspectRequest = useCallback(() => {
    if (!currentSimulationEvent || !isPacketInspectionActive) {
      return;
    }

    setPacketInspectorWindows((prev) => {
      const existing = prev.find((w) => w.eventId === currentSimulationEvent.id);
      if (existing) {
        return prev.map((w) =>
          w.eventId === currentSimulationEvent.id ? { ...w, isOpen: true, pinned: true } : w,
        );
      }

      return [...prev, { eventId: currentSimulationEvent.id, isOpen: true, pinned: true }];
    });
  }, [currentSimulationEvent, isPacketInspectionActive]);

  const handlePacketInspectorClose = useCallback((eventId: string) => {
    setPacketInspectorWindows((prev) => prev.filter((w) => w.eventId !== eventId));
  }, []);

  return {
    packetInspectorWindows,
    tableInspectionWindows,
    simulationMessageHoverState,
    simulationTqDisclosureByEvent,
    simulationSequenceDisclosureByEvent,
    hoveredSimulationPeerState,
    tableInspectionSuppressHoverRef,
    handleSimulationPeerHoverChange,
    handleSimulationTqDisclosureToggle,
    handleSimulationSequenceDisclosureToggle,
    handleTableInspectionPeerHoverChange,
    handleTableInspectionClose,
    handleMessageAnimationHoverChange,
    handleMessageAnimationInspectRequest,
    handlePacketInspectorClose,
    setPacketInspectorWindows,
    setTableInspectionWindows,
  };
};
