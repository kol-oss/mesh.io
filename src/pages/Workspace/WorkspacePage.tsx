import Navigation from "../../components/Navigation/Navigation";
import Properties from "../../components/Properties/Properties";
import Toolbar from "../../components/Toolbar/Toolbar";
import Workspace from "../../components/Workspace/Workspace";

export default function WorkspacePage() {
  return (
    <>
      <div className="workspace-page__nav">
        <Navigation />
      </div>
      <div className="workspace-page__workspace">
        <Workspace />
      </div>
      <div className="workspace-page__toolbar">
        <Toolbar />
      </div>
      <div className="workspace-page__properties">
        <Properties />
      </div>
    </>
  );
}
