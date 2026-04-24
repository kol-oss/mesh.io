import { useState } from "react";

import Navigation from "../../components/Navigation/Navigation";
import Properties from "../../components/Properties/Properties";
import Toolbar from "../../components/Toolbar/Toolbar";
import Workspace from "../../components/Workspace/Workspace";
import { useLocalStorage } from "../../hooks/storage/useLocalStorage";
import type { NetworkEntity } from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";
import { INITIAL_NETWORK_ENTITIES } from "../../utils/navigation/entities";
import { INITIAL_WORKFLOW_STEPS } from "../../utils/navigation/steps";

export default function WorkspacePage() {
  const [selectedId, setSelectedId] = useLocalStorage<string | null>("mesh_selected_id", null);
  const [selectedSource, setSelectedSource] = useLocalStorage<"entities" | "steps" | null>(
    "mesh_selected_source",
    null,
  );
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    setIsNavCollapsed((prev) => !prev);
  };
  const [entities, setEntities] = useLocalStorage<NetworkEntity[]>(
    "mesh_entities",
    INITIAL_NETWORK_ENTITIES,
  );
  const [steps, setSteps] = useLocalStorage<WorkflowStep[]>("mesh_steps", INITIAL_WORKFLOW_STEPS);

  const handleEntitySelect = (id: string) => {
    if (selectedSource === "entities" && selectedId === id) {
      setSelectedId(null);
      setSelectedSource(null);
      return;
    }

    setSelectedId(id);
    setSelectedSource("entities");
  };

  const handleStepSelect = (id: string) => {
    if (selectedSource === "steps" && selectedId === id) {
      setSelectedId(null);
      setSelectedSource(null);
      return;
    }

    setSelectedId(id);
    setSelectedSource("steps");
  };

  const handleClearSelection = () => {
    setSelectedId(null);
    setSelectedSource(null);
  };

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
          onClearSelection={handleClearSelection}
          isCollapsed={isNavCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>
      <div className="workspace-page__workspace">
        <Workspace />
      </div>
      <div className="workspace-page__toolbar">
        <Toolbar />
      </div>
      <div className="workspace-page__properties">
        <Properties
          selectedId={selectedId}
          selectedSource={selectedSource}
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
