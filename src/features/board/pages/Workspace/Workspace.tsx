import Navigation from "@/features/navigation/components/Navigation/Navigation";
import Properties from "@/features/properties/components/Properties/Properties";
import Toolbar from "@/features/tools/components/Toolbar/Toolbar";
import WorkspaceCanvas from "@/features/board/components/WorkspaceCanvas/WorkspaceCanvas";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import { useWorkspaceStore } from "@/features/board/store/workspace";

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
    isNavCollapsed,
    isSimulationActive,
    isStepPlacementMode,
    placementMode,
    setSimulationInspectionMode,
    simulationInspectionMode,
    selectedId,
    selectedSource,
    openedTabs,
    isRefreshHidden,
    setEntitiesOpened,
    setStepsOpened,
    setStepsRefreshHidden,
    setEntities,
    setSteps,
    setTexts,
    steps,
    texts,
    toggleNavCollapse,
    handleEntitySelect,
    handleExportWorkspace,
    handleImportWorkspace,
    handlePrevSimulationEvent,
    handlePrevSimulationStep,
    handleNewWorkspace,
    handlePlacementModeChange,
    handleRunSimulation,
    handleStopSimulation,
    handleStepSelect,
    handleWorkspaceEntitySelect,
    handleWorkspaceStepSelect,
    clearSelection,
  } = useWorkspaceStore();

  return (
    <div className="workspace-page">
      <div className="workspace-page__nav">
        <Navigation
          selectedId={selectedId}
          selectedSource={selectedSource}
          entities={entities}
          setEntities={setEntities}
          steps={steps}
          setSteps={setSteps}
          onEntitySelect={handleEntitySelect}
          onStepSelect={handleStepSelect}
          onClearSelection={clearSelection}
          entitiesOpened={openedTabs.entities}
          onEntitiesOpenedChange={setEntitiesOpened}
          stepsOpened={openedTabs.steps}
          onStepsOpenedChange={setStepsOpened}
          stepsRefreshHidden={isRefreshHidden}
          onStepsRefreshHiddenChange={setStepsRefreshHidden}
          onFileNew={handleNewWorkspace}
          onFileExport={handleExportWorkspace}
          onFileImport={handleImportWorkspace}
          isCollapsed={isNavCollapsed}
          onToggleCollapse={toggleNavCollapse}
        />
      </div>
      <div className="workspace-page__workspace">
        <WorkspaceCanvas
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
          canGoPrevStep={canGoPrevStep}
          canGoNextStep={canGoNextStep}
          isSimulationActive={isSimulationActive}
        />
      </div>
      <div className="workspace-page__properties">
        <Properties
          selectedId={
            isStepPlacementMode ||
            (currentSimulationStepResult !== null && selectedSource === SelectionSource.Steps)
              ? null
              : selectedId
          }
          selectedSource={
            isStepPlacementMode ||
            (currentSimulationStepResult !== null && selectedSource === SelectionSource.Steps)
              ? null
              : selectedSource
          }
          entities={entities}
          setEntities={setEntities}
          steps={steps}
          setSteps={setSteps}
          isNavCollapsed={isNavCollapsed}
          isEntityReadOnly={isSimulationActive}
        />
      </div>
    </div>
  );
}
