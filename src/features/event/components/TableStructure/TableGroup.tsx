import { ChevronDown, ChevronRight } from "lucide-react";

type TableGroupProps = {
  name: string;
  isOpen?: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

export default function TableGroup({ name, isOpen = false, onToggle, children }: TableGroupProps) {
  const Icon = isOpen ? ChevronDown : ChevronRight;
  return (
    <div className="simulation-panel__table-block">
      <div className="simulation-panel__tq-disclosure">
        <button
          className="simulation-panel__tq-toggle"
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <Icon size={12} className={`simulation-panel__tq-toggle-icon`} />
          <span className="simulation-panel__tq-toggle-label">{name}</span>
        </button>
      </div>
      {isOpen ? children : null}
    </div>
  );
}
