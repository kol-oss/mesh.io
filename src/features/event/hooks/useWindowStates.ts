import { useCallback, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/shared/store/hooks";
import { selectCurrentSimulationEvent } from "@/shared/store/selectors";
import {
  closePacketInspectorWindow,
  closeTableInspectionWindow,
  openPacketInspectorPinned,
  setHoveredSimulationPeer,
  setMessageAnimationHover,
  tableInspectionPeerHoverChange,
  toggleSequenceDisclosure,
  toggleTqDisclosure,
} from "@/shared/store/slices/simulationSlice";
import { MessageType } from "@/shared/types/common/messages";
import type { UUID } from "@/shared/types/common/uuid";

export const useWindowStates = () => {
  const dispatch = useAppDispatch();

  const currentSimulationEvent = useAppSelector(selectCurrentSimulationEvent);
  const currentSimulationEventId = currentSimulationEvent?.id ?? null;

  const packetInspectorWindows = useAppSelector((state) => state.simulation.packetInspectorWindows);
  const tableInspectionWindows = useAppSelector((state) => state.simulation.tableInspectionWindows);
  const simulationMessageHoverState = useAppSelector(
    (state) => state.simulation.simulationMessageHoverState,
  );
  const simulationTqDisclosureByEvent = useAppSelector(
    (state) => state.simulation.simulationTqDisclosureByEvent,
  );
  const simulationSequenceDisclosureByEvent = useAppSelector(
    (state) => state.simulation.simulationSequenceDisclosureByEvent,
  );
  const hoveredSimulationPeerState = useAppSelector(
    (state) => state.simulation.hoveredSimulationPeerState,
  );

  const tableInspectionSuppressHoverRef = useRef(false);

  const handleSimulationPeerHoverChange = useCallback(
    (peerId: UUID | null) => {
      dispatch(
        setHoveredSimulationPeer(
          currentSimulationEvent ? { eventId: currentSimulationEvent.id, peerId } : null,
        ),
      );
    },
    [currentSimulationEvent, dispatch],
  );

  const handleSimulationTqDisclosureToggle = useCallback(
    (eventId: UUID) => {
      dispatch(toggleTqDisclosure(eventId));
    },
    [dispatch],
  );

  const handleSimulationSequenceDisclosureToggle = useCallback(
    (eventId: UUID) => {
      dispatch(toggleSequenceDisclosure(eventId));
    },
    [dispatch],
  );

  const handleTableInspectionPeerHoverChange = useCallback(
    (peerId: UUID | null) => {
      if (peerId === null) {
        tableInspectionSuppressHoverRef.current = false;
      }
      if (tableInspectionSuppressHoverRef.current) return;
      dispatch(tableInspectionPeerHoverChange(peerId));
    },
    [dispatch],
  );

  const handleTableInspectionClose = useCallback(
    (peerId: UUID) => {
      tableInspectionSuppressHoverRef.current = true;
      dispatch(closeTableInspectionWindow(peerId));
    },
    [dispatch],
  );

  const handleMessageAnimationHoverChange = useCallback(
    (isHovered: boolean) => {
      dispatch(setMessageAnimationHover({ isHovered, currentSimulationEventId }));
    },
    [currentSimulationEventId, dispatch],
  );

  const handleMessageAnimationInspectRequest = useCallback(() => {
    if (!currentSimulationEvent) return;

    const eventMessage =
      "message" in currentSimulationEvent.details ? currentSimulationEvent.details.message : null;
    if (eventMessage?.type === MessageType.Packet || eventMessage?.type === MessageType.DsrPacket) {
      return;
    }

    dispatch(openPacketInspectorPinned(currentSimulationEvent.id));
  }, [currentSimulationEvent, dispatch]);

  const handlePacketInspectorClose = useCallback(
    (eventId: UUID) => {
      dispatch(closePacketInspectorWindow(eventId));
    },
    [dispatch],
  );

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
  };
};
