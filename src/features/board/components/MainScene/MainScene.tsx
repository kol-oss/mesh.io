import Scene from "@/features/board/components/Scene/Scene";
import EventDescription from "@/features/event/components/EventDescription/EventDescription";
import type { ToolbarPlacementMode } from "@/shared/types/action";
import { ActionMode as PlacementMode } from "@/shared/types/action";
import type { Event } from "@/shared/types/processor/events";
import type { StepResult } from "@/shared/types/processor/simulation";
import type { WorkspaceSceneProps } from "@/shared/types/workspace/scene";

type Props = {
  placementMode: ToolbarPlacementMode;
  panOffset: { x: number; y: number };
  workspaceRef: React.MutableRefObject<HTMLElement | null>;
  handleBackgroundPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  handleBackgroundPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  handleBackgroundPointerEnd: (event: React.PointerEvent<HTMLElement>) => void;
  currentSimulationStepResult: StepResult | null;
  currentSimulationEvent: Event | null;
  simulationAnchorPosition: { x: number; y: number } | null;
  canGoNextSimulationEvent: boolean;
  canGoPrevSimulationEvent: boolean;
  currentSimulationEventIndex: number;
  currentSimulationEventsTotal: number;
  simulationTqDisclosureByEvent: Record<string, boolean>;
  simulationSequenceDisclosureByEvent: Record<string, boolean>;
  onPrevSimulationEvent: () => void;
  onNextSimulationEvent: () => void;
  onSimulationPeerHoverChange: (peerId: string | null) => void;
  onSimulationTqDisclosureToggle: (eventId: string) => void;
  onSimulationSequenceDisclosureToggle: (eventId: string) => void;
  workspaceSceneProps: WorkspaceSceneProps;
};

export default function MainScene({
  placementMode,
  panOffset,
  workspaceRef,
  handleBackgroundPointerDown,
  handleBackgroundPointerMove,
  handleBackgroundPointerEnd,
  currentSimulationStepResult,
  currentSimulationEvent,
  simulationAnchorPosition,
  canGoNextSimulationEvent,
  canGoPrevSimulationEvent,
  currentSimulationEventIndex,
  currentSimulationEventsTotal,
  simulationTqDisclosureByEvent,
  simulationSequenceDisclosureByEvent,
  onPrevSimulationEvent,
  onNextSimulationEvent,
  onSimulationPeerHoverChange,
  onSimulationTqDisclosureToggle,
  onSimulationSequenceDisclosureToggle,
  workspaceSceneProps,
}: Props) {
  return (
    <section
      className={`workspace${placementMode ? " workspace--placing" : ""}${placementMode === PlacementMode.Link ? " workspace--linking" : ""}`}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerEnd}
      onPointerCancel={handleBackgroundPointerEnd}
      ref={workspaceRef}
    >
      <div
        className="workspace__grid"
        aria-hidden="true"
        style={{
          backgroundPosition: `calc(50% - 24px + ${panOffset.x}px) calc(50% - 24px + ${panOffset.y}px)`,
        }}
      />
      <div
        className="workspace__scene"
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
      >
        {currentSimulationStepResult && currentSimulationEvent && simulationAnchorPosition ? (
          <EventDescription
            key={`${currentSimulationStepResult.step.id}-${currentSimulationEvent.id}`}
            anchorX={simulationAnchorPosition.x}
            anchorY={simulationAnchorPosition.y}
            canGoNextEvent={canGoNextSimulationEvent}
            canGoPrevEvent={canGoPrevSimulationEvent}
            currentEvent={currentSimulationEvent}
            currentEventIndex={currentSimulationEventIndex}
            currentEventsTotal={currentSimulationEventsTotal}
            currentStepResult={currentSimulationStepResult}
            isTqDisclosureOpen={simulationTqDisclosureByEvent[currentSimulationEvent.id] ?? false}
            isSequenceDisclosureOpen={
              simulationSequenceDisclosureByEvent[currentSimulationEvent.id] ?? false
            }
            onPeerHoverChange={onSimulationPeerHoverChange}
            onNextEvent={onNextSimulationEvent}
            onPrevEvent={onPrevSimulationEvent}
            onTqDisclosureToggle={onSimulationTqDisclosureToggle}
            onSequenceDisclosureToggle={onSimulationSequenceDisclosureToggle}
          />
        ) : null}

        <Scene {...workspaceSceneProps} />
      </div>
    </section>
  );
}
