import Navigation from "../../components/Navigation/Navigation";
import Properties from "../../components/Properties/Properties";
import SimulationPanel from "../../components/Simulation/SimulationPanel";
import Toolbar from "../../components/Toolbar/Toolbar";
import WorkspaceCanvas from "../../components/Workspace/Workspace";
import { useWorkspaceStore } from "../../store/workspace";

export default function Workspace() {
  const {
    canGoNextStep,
    canGoPrevStep,
    currentSimulationStepResult,
    entities,
    handleNextSimulationStep,
    isNavCollapsed,
    isSimulationActive,
    isStepPlacementMode,
    placementMode,
    setSimulationInspectionMode,
    simulationInspectionMode,
    simulationPlayback,
    selectedId,
    selectedSource,
    setEntities,
    setSteps,
    setTexts,
    steps,
    texts,
    toggleNavCollapse,
    handleEntitySelect,
    handleExportWorkspace,
    handleImportWorkspace,
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
      <div className="workspace-page__simulation">
        <SimulationPanel
          currentStepResult={currentSimulationStepResult}
          currentStepIndex={simulationPlayback.currentStepIndex}
          totalSteps={simulationPlayback.result?.stepResults.length ?? 0}
          showRoutingTables={simulationInspectionMode === "routingTable"}
        />
      </div>
      <div className="workspace-page__properties">
        <Properties
          selectedId={
            isStepPlacementMode ||
            (currentSimulationStepResult !== null && selectedSource === "steps")
              ? null
              : selectedId
          }
          selectedSource={
            isStepPlacementMode ||
            (currentSimulationStepResult !== null && selectedSource === "steps")
              ? null
              : selectedSource
          }
          entities={entities}
          setEntities={setEntities}
          steps={steps}
          setSteps={setSteps}
          isNavCollapsed={isNavCollapsed}
        />
      </div>
    </div>
  );
}
