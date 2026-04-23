import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronRight, Plus } from "lucide-react";

import { INITIAL_NETWORK_ENTITIES } from "../../utils/navigation/entities";

export default function EntityList() {
  const [isOpened, setIsOpened] = useState(false);

  const toggleOpen = () => setIsOpened((prevState) => !prevState);

  const handleHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const handleAddEntity = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // TODO: Add new entity logic
  };

  return (
    <div className="navigation__entities">
      <div
        className="navigation__entities-header"
        onClick={toggleOpen}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isOpened}
      >
        <ChevronRight
          size={10}
          className={`navigation__entities-chevron ${
            isOpened ? "navigation__entities-chevron--open" : ""
          }`}
        />
        <span className="navigation__entities-title">Entities</span>
        <button
          className="navigation__entities-add"
          onClick={handleAddEntity}
          type="button"
          aria-label="Add new entity"
        >
          <Plus size={14} />
        </button>
      </div>

      {isOpened && (
        <div className="navigation__entities-items">
          {INITIAL_NETWORK_ENTITIES.map((networkEntity) => (
            <div key={networkEntity.name} className="navigation__entity-item">
              <span className="navigation__entity-title">{networkEntity.name}</span>
              <span className="navigation__entity-type">{networkEntity.deviceType}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
