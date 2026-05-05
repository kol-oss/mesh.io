import { ExternalLink, Lock, MoveHorizontal, MoveVertical } from "lucide-react";
import { Link } from "react-router-dom";

import { ui } from "../../../i18n/messages";
import { EntityType } from "../../../types/enums";
import type { ObstacleEntity } from "../../../types/entities";
import type { ObstaclePropertiesPanelProps } from "../../../types/properties";
import { parseNumberValue, parsePositiveNumberValue } from "../../../utils/properties";

export default function ObstacleProperties({
  widthPercent,
  onResizeStart,
  selected: selectedObstacle,
  entities,
  setEntities,
  title,
  description,
}: ObstaclePropertiesPanelProps) {
  const isLocked = selectedObstacle.locked === true;
  const isObstacleNameMissing = selectedObstacle.name.trim() === "";

  const updateObstacle = (changes: Partial<ObstacleEntity>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.id !== selectedObstacle.id || entity.type !== EntityType.Obstacle) {
        return entity;
      }
      return { ...entity, ...changes };
    });
    setEntities(updatedEntities);
  };

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

      <section className="properties__section">
        <p className="properties__section-title">{ui.properties.sectionConfiguration}</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isObstacleNameMissing ? "properties__field-label--required" : ""}`}
          >
            {ui.properties.fieldName}
          </span>
          <input
            className={`properties__input ${isObstacleNameMissing ? "properties__required-outline" : ""}`}
            type="text"
            value={selectedObstacle.name}
            onChange={(event) => updateObstacle({ name: event.target.value })}
          />
        </label>

        <label className="properties__field">
          <span className="properties__field-label">{ui.properties.fieldPosition}</span>
          <div className="properties__inline-group">
            <div className="properties__input-with-icon">
              <span className="properties__input-icon">X</span>
              <input
                className="properties__input"
                type="number"
                value={selectedObstacle.x}
                onChange={(event) =>
                  updateObstacle({
                    x: parseNumberValue(event.target.value, selectedObstacle.x),
                  })
                }
              />
            </div>
            <div className="properties__input-with-icon">
              <span className="properties__input-icon">Y</span>
              <input
                className="properties__input"
                type="number"
                value={selectedObstacle.y}
                onChange={(event) =>
                  updateObstacle({
                    y: parseNumberValue(event.target.value, selectedObstacle.y),
                  })
                }
              />
            </div>
          </div>
        </label>

        <label className="properties__field">
          <span className="properties__field-label">{ui.properties.fieldSize}</span>
          <div className="properties__inline-group">
            <div className="properties__input-with-prefix">
              <MoveHorizontal size={12} />
              <input
                className="properties__input"
                type="number"
                min="1"
                value={selectedObstacle.width}
                onChange={(event) =>
                  updateObstacle({
                    width: parsePositiveNumberValue(event.target.value, selectedObstacle.width),
                  })
                }
              />
            </div>
            <div className="properties__input-with-prefix">
              <MoveVertical size={12} />
              <input
                className="properties__input"
                type="number"
                min="1"
                value={selectedObstacle.height}
                onChange={(event) =>
                  updateObstacle({
                    height: parsePositiveNumberValue(event.target.value, selectedObstacle.height),
                  })
                }
              />
            </div>
          </div>
        </label>
      </section>
    </aside>
  );
}
