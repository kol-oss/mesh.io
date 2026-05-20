import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

type SecondaryDescriptionProps = {
  title: string;
  children?: React.ReactNode;
};

export default function SecondaryDescription({ title, children }: SecondaryDescriptionProps) {
  const [isOpened, setIsOpened] = useState(false);
  const Icon = isOpened ? ChevronDown : ChevronRight;
  return (
    <>
      <div className="simulation-panel__tq-disclosure">
        <button
          className="simulation-panel__tq-toggle"
          type="button"
          onClick={() => setIsOpened(!isOpened)}
          aria-expanded={isOpened}
        >
          <Icon size={12} className={`simulation-panel__tq-toggle-icon`} />
          <span className="simulation-panel__tq-toggle-label">{title}</span>
        </button>
        {isOpened ? (
          <div className="simulation-panel__description simulation-panel__description--secondary">
            {children}
          </div>
        ) : null}
      </div>
    </>
  );
}
