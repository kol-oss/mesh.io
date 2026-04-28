import Navigation from "../../components/Navigation/Navigation";
import Properties from "../../components/Properties/Properties";
import Toolbar from "../../components/Toolbar/Toolbar";
import WorkspaceCanvas from "../../components/Workspace/Workspace";
import { useWorkspaceStore } from "../../store/workspace";

export default function Workspace() {
  const {
    entities,
    isNavCollapsed,
    isStepPlacementMode,
    placementMode,
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
    handleNewWorkspace,
    handlePlacementModeChange,
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
        <Toolbar onPlacementModeChange={handlePlacementModeChange} />
      </div>
      <div className="workspace-page__properties">
        <Properties
          selectedId={isStepPlacementMode ? null : selectedId}
          selectedSource={isStepPlacementMode ? null : selectedSource}
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
