import EntityList from "../EntityList/EntityList";
import StepsList from "../StepsList/StepsList";
import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import NavigationHeader from "./NavigationHeader";
import NavigationMenu from "./NavigationMenu";

export default function Navigation() {
  const { widthPercent, onResizeStart } = useSidebarResize();

  return (
    <aside className="navigation" style={{ width: `${widthPercent}%` }}>
      <NavigationHeader />
      <NavigationMenu />
      <EntityList />
      <StepsList />
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
