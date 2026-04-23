import { useState } from "react";
import EntityList from "../EntityList/EntityList";
import StepsList from "../StepsList/StepsList";
import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import NavigationHeader from "./NavigationHeader";
import NavigationMenu from "./NavigationMenu";

export default function Navigation() {
  const { widthPercent, onResizeStart } = useSidebarResize();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<"entities" | "steps" | null>(null);

  const handleEntitySelect = (id: string) => {
    if (selectedSource === "entities" && selectedId === id) {
      handleClearSelection();
      return;
    }
    setSelectedId(id);
    setSelectedSource("entities");
  };

  const handleStepSelect = (id: string) => {
    if (selectedSource === "steps" && selectedId === id) {
      handleClearSelection();
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
    <aside className="navigation" style={{ width: `${widthPercent}%` }}>
      <NavigationHeader />
      <NavigationMenu />
      <EntityList
        selectedId={selectedSource === "entities" ? selectedId : null}
        onSelect={handleEntitySelect}
        onClearSelection={handleClearSelection}
      />
      <StepsList
        selectedId={selectedSource === "steps" ? selectedId : null}
        onSelect={handleStepSelect}
        onClearSelection={handleClearSelection}
      />
      <div
        className="navigation__resizer"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        onPointerDown={onResizeStart}
      />
    </aside>
  );
}
