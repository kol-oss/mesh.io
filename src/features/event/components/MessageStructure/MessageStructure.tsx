import { type Event } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import { type StepResult } from "@/shared/types/common/simulation";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import AodvMessageStructure from "./AodvMessageStructure";
import BatmanMessageStructure from "./BatmanMessageStructure";
import DsdvMessageStructure from "./DsdvMessageStructure";
import DsrMessageStructure from "./DsrMessageStructure";
import OlsrMessageStructure from "./OlsrMessageStructure";

type MessageStructureProps = {
  isOpen: boolean;
  currentEvent: Event | null;
  currentStepResult: StepResult | null;
  onClose: () => void;
};

export default function MessageStructure({
  isOpen,
  currentEvent,
  currentStepResult,
  onClose,
}: MessageStructureProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      setDragOffset({
        x: dragState.startOffsetX + (event.clientX - dragState.startPointerX),
        y: dragState.startOffsetY + (event.clientY - dragState.startPointerY),
      });
    };

    const handlePointerEnd = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [isDragging]);

  if (!isOpen || !currentEvent || !currentStepResult) {
    return null;
  }

  const handlePanelPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startOffsetX: dragOffset.x,
      startOffsetY: dragOffset.y,
    };
    setIsDragging(true);
    event.stopPropagation();
    event.preventDefault();
  };

  const eventMessage = getEventMessage(currentEvent);
  if (eventMessage?.type === MessageType.Packet) {
    return null;
  }

  const peerNameById = new Map(
    currentStepResult.snapshot.peers.map((peer) => [peer.id, peer.name]),
  );
  const inspectorTitle = getPacketInspectorTitle(eventMessage);
  const packetStructureAria = getPacketInspectorStructureAria(eventMessage);
  const readMorePath = getPacketReadMorePath(eventMessage);

  const { protocol } = currentEvent;
  return (
    <aside
      className={`simulation-panel simulation-panel--inspector${isDragging ? " simulation-panel--dragging" : ""}`}
      aria-label={"Packet structure inspector"}
      onPointerDown={handlePanelPointerDown}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <header className="simulation-panel__header" onPointerDown={handleHeaderPointerDown}>
        <h2 className="simulation-panel__title">{inspectorTitle}</h2>
        <button
          className="simulation-panel__close-button"
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={"Close packet structure"}
        >
          <X size={14} />
        </button>
      </header>
      <section className="simulation-panel__section">
        {protocol == RoutingProtocol.BATMAN && (
          <BatmanMessageStructure
            message={eventMessage!}
            peers={currentStepResult.snapshot.peers}
          />
        )}

        {protocol == RoutingProtocol.DSDV &&
          eventMessage?.type === MessageType.DsdvRouteUpdateMessage && (
            <DsdvMessageStructure message={eventMessage} peers={currentStepResult.snapshot.peers} />
          )}

        {eventMessage?.type === MessageType.AodvRouteRequestMessage ||
        eventMessage?.type === MessageType.AodvRouteReplyMessage ||
        eventMessage?.type === MessageType.AodvRouteErrorMessage ||
        eventMessage?.type === MessageType.AodvHelloMessage ? (
          <AodvMessageStructure
            message={eventMessage}
            peerNameById={peerNameById}
            packetStructureAria={packetStructureAria}
          />
        ) : eventMessage?.type === MessageType.OlsrHelloMessage ||
          eventMessage?.type === MessageType.OlsrTcMessage ? (
          <OlsrMessageStructure
            message={eventMessage}
            peerNameById={peerNameById}
            packetStructureAria={packetStructureAria}
          />
        ) : eventMessage?.type === MessageType.DsrRouteRequestMessage ||
          eventMessage?.type === MessageType.DsrRouteReplyMessage ||
          eventMessage?.type === MessageType.DsrRouteErrorMessage ? (
          <DsrMessageStructure
            message={eventMessage}
            peerNameById={peerNameById}
            packetStructureAria={packetStructureAria}
          />
        ) : (
          <></>
        )}
      </section>
      <footer className="simulation-panel__footer">
        <a
          className="simulation-panel__read-more"
          href={readMorePath}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={12} />
          {"Read more"}
        </a>
      </footer>
    </aside>
  );
}

const getPacketInspectorTitle = (message: Message | null) => {
  if (message?.type === MessageType.BatmanEchoLocationMessage) {
    return "Echo Location Message (ELP)";
  }

  if (message?.type === MessageType.DsdvRouteUpdateMessage) {
    return "DSDV Update Message";
  }

  if (message?.type === MessageType.AodvRouteRequestMessage) {
    return "AODV Route Request (RREQ)";
  }

  if (message?.type === MessageType.AodvRouteReplyMessage) {
    return "AODV Route Reply (RREP)";
  }

  if (message?.type === MessageType.AodvRouteErrorMessage) {
    return "AODV Route Error (RERR)";
  }

  if (message?.type === MessageType.AodvHelloMessage) {
    return "AODV HELLO Message";
  }

  if (message?.type === MessageType.OlsrHelloMessage) {
    return "OLSR HELLO Message";
  }

  if (message?.type === MessageType.OlsrTcMessage) {
    return "OLSR TC Message";
  }

  if (message?.type === MessageType.DsrRouteRequestMessage) {
    return "DSR Route Request (RREQ)";
  }

  if (message?.type === MessageType.DsrRouteReplyMessage) {
    return "DSR Route Reply (RREP)";
  }

  if (message?.type === MessageType.DsrRouteErrorMessage) {
    return "DSR Route Error (RERR)";
  }

  return "Originator Message version 2 (OGMv2)";
};

const getPacketInspectorStructureAria = (message: Message | null) => {
  if (message?.type === MessageType.BatmanEchoLocationMessage) {
    return "Echo Location Message structure";
  }

  if (message?.type === MessageType.DsdvRouteUpdateMessage) {
    return "DSDV route update structure";
  }

  if (message?.type === MessageType.AodvRouteRequestMessage) {
    return "AODV Route Request structure";
  }

  if (message?.type === MessageType.AodvRouteReplyMessage) {
    return "AODV Route Reply structure";
  }

  if (message?.type === MessageType.AodvRouteErrorMessage) {
    return "AODV Route Error structure";
  }

  if (message?.type === MessageType.AodvHelloMessage) {
    return "AODV HELLO structure";
  }

  if (message?.type === MessageType.OlsrHelloMessage) {
    return "OLSR HELLO message structure";
  }

  if (message?.type === MessageType.OlsrTcMessage) {
    return "OLSR TC message structure";
  }

  if (message?.type === MessageType.DsrRouteRequestMessage) {
    return "DSR Route Request message structure";
  }

  if (message?.type === MessageType.DsrRouteReplyMessage) {
    return "DSR Route Reply message structure";
  }

  if (message?.type === MessageType.DsrRouteErrorMessage) {
    return "DSR Route Error message structure";
  }

  return "Originator Message version 2 structure";
};

const getPacketReadMorePath = (message: Message | null) => {
  if (message?.type === MessageType.BatmanEchoLocationMessage) {
    return "/docs/batman#echo-location-protocol";
  }

  if (message?.type === MessageType.BatmanOriginatorMessage) {
    return "/docs/batman#originator-message";
  }

  if (message?.type === MessageType.DsdvRouteUpdateMessage) {
    return "/docs/dsdv#full-and-incremental-updates";
  }

  if (message?.type === MessageType.AodvRouteRequestMessage) {
    return "/docs/aodv#route-discovery";
  }

  if (message?.type === MessageType.AodvRouteReplyMessage) {
    return "/docs/aodv#route-discovery";
  }

  if (message?.type === MessageType.AodvRouteErrorMessage) {
    return "/docs/aodv#route-maintenance";
  }

  if (message?.type === MessageType.AodvHelloMessage) {
    return "/docs/aodv#route-maintenance";
  }

  if (message?.type === MessageType.OlsrHelloMessage) {
    return "/docs/olsr#neighbor-sensing";
  }

  if (message?.type === MessageType.OlsrTcMessage) {
    return "/docs/olsr#topology-discovery";
  }

  if (message?.type === MessageType.DsrRouteRequestMessage) {
    return "/docs/dsr#route-discovery";
  }

  if (message?.type === MessageType.DsrRouteReplyMessage) {
    return "/docs/dsr#route-discovery";
  }

  if (message?.type === MessageType.DsrRouteErrorMessage) {
    return "/docs/dsr#route-maintenance";
  }

  return "/docs/batman#what-you-need-to-know";
};

const getEventMessage = (event: Event): Message | null => {
  if (!("message" in event.details)) {
    return null;
  }

  return event.details.message as Message;
};
