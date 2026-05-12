import { ExternalLink, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import { ui } from "../../../../shared/i18n/messages";
import type { PropertiesResizeHandler } from "../../../../shared/types/properties";

type PropertyPanelProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  isLocked: boolean;
  title: string;
  description: string;
  children: ReactNode;
};

export default function PropertyPanel({
  widthPercent,
  onResizeStart,
  isLocked,
  title,
  description,
  children,
}: PropertyPanelProps) {
  return (
    <aside
      className={`properties ${isLocked ? "properties--locked" : ""}`}
      style={{ width: `${widthPercent}%` }}
    >
      <div
        className="properties__resizer"
        role="separator"
        aria-label={ui.properties.resizeAria}
        aria-orientation="vertical"
        onPointerDown={onResizeStart}
      />

      <header className="properties__header">
        <p className="properties__title">{title}</p>
        <p className="properties__subtitle">{description}</p>
        <Link className="properties__read-more" to="/docs" target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          {ui.common.readMore}
        </Link>
      </header>

      {isLocked && (
        <div className="properties__locked-notice">
          <Lock size={12} />
          {ui.properties.entityLockedNotice}
        </div>
      )}

      {children}
    </aside>
  );
}
