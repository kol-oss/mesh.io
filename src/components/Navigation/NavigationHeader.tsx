import { ChevronsLeft } from "lucide-react";

export default function NavigationHeader() {
  return (
    <div className="navigation__header">
      <div className="navigation__header-general">
        <p className="navigation__header-general-title">Mesh IO</p>
        <p className="navigation__header-general-moto">Design and Learn</p>
      </div>

      <div>
        <button
          className="navigation__compact-button"
          type="button"
          aria-label="Compact navigation"
        >
          <ChevronsLeft size={13} />
        </button>
      </div>
    </div>
  );
}
