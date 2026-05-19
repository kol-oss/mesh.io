import Canvas from "@/features/board/components/Canvas/Canvas";
import { useBoardStore } from "@/features/board/store/board";
import Navigation from "@/features/navigation/components/Navigation/Navigation";
import Properties from "@/features/properties/components/Properties/Properties";
import Toolbar from "@/features/tools/components/Toolbar/Toolbar";

export default function Workspace() {
  const {
    canGoNextEvent,
    canGoNextStep,
    canGoPrevEvent,
    canGoPrevStep,
    currentSimulationEvent,
    currentSimulationEventIndex,
    currentSimulationEvents,
    currentSimulationStepResult,
    entities,
    handleNextSimulationEvent,
    handleNextSimulationStep,
    isSimulationActive,
    placementMode,
    setSimulationInspectionMode,
    simulationInspectionMode,
    selectedId,
    selectedSource,
    setEntities,
    setSteps,
    setTexts,
    steps,
    texts,
    handlePrevSimulationEvent,
    handlePrevSimulationStep,
    handlePlacementModeChange,
    handleRunSimulation,
    handleStopSimulation,
    handleWorkspaceEntitySelect,
    handleWorkspaceStepSelect,
    clearSelection,
  } = useBoardStore();

  return (
    <div className="workspace-page">
      <div className="workspace-page__nav">
        <Navigation currentSimulationStepResult={currentSimulationStepResult} />
      </div>
      <div className="workspace-page__workspace">
        <Canvas
          entities={entities}
          setEntities={setEntities}
          steps={steps}
          setSteps={setSteps}
          texts={texts}
          setTexts={setTexts}
          simulationInspectionMode={simulationInspectionMode}
          currentSimulationEvent={currentSimulationEvent}
          currentSimulationEventIndex={currentSimulationEventIndex}
          currentSimulationEventsTotal={currentSimulationEvents.length}
          currentSimulationStepResult={currentSimulationStepResult}
          canGoPrevSimulationEvent={canGoPrevEvent}
          canGoNextSimulationEvent={canGoNextEvent}
          isSimulationActive={isSimulationActive}
          onPrevSimulationEvent={handlePrevSimulationEvent}
          onNextSimulationEvent={handleNextSimulationEvent}
          selectedId={selectedId}
          selectedSource={selectedSource}
          placementMode={placementMode}
          onEntitySelect={handleWorkspaceEntitySelect}
          onStepSelect={handleWorkspaceStepSelect}
          onClearSelection={clearSelection}
        />
      </div>
      <div className="workspace-page__toolbar">
        <Toolbar
          onPlacementModeChange={handlePlacementModeChange}
          onRun={handleRunSimulation}
          onStop={handleStopSimulation}
          onPrevStep={handlePrevSimulationStep}
          onNextStep={handleNextSimulationStep}
          onInspectionModeChange={setSimulationInspectionMode}
          prevExist={canGoPrevStep}
          nextExist={canGoNextStep}
          isRuntime={isSimulationActive}
        />
      </div>
      <div className="workspace-page__properties">
        <Properties isRuntime={!!currentSimulationStepResult} isLocked={isSimulationActive} />
      </div>
    </div>
  );
}
