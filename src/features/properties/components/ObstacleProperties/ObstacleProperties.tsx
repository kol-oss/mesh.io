import LockMessage from "@/features/properties/components/Property/LockMessage";
import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import PropertyHeader from "@/features/properties/components/Property/PropertyHeader";
import TextPropertyField from "@/features/properties/components/Property/TextPropertyField";
import Letter from "@/shared/components/Letter/Letter";
import type { ObstacleEntity } from "@/shared/types/model/entities";
import type { EntityPropertiesProps } from "@/shared/types/view/properties";
import { updateEntity } from "@/shared/utils/mutation";
import { parseNumberValue, parsePositiveNumberValue } from "@/shared/utils/properties";
import { MoveHorizontal, MoveVertical } from "lucide-react";

type ObstaclePropertiesProps = EntityPropertiesProps<ObstacleEntity>;

export default function ObstacleProperties({
  selected,
  entities,
  setEntities,
}: ObstaclePropertiesProps) {
  const { name, locked: isLocked } = selected;
  const updateObstacle = (changes: Partial<ObstacleEntity>) => {
    setEntities(updateEntity(selected, entities, changes));
  };

  return (
    <>
      <PropertyHeader title="Obstacle" link="/docs/system#obstacles">
        {"A physical barrier that blocks signal propagation between nearby nodes."}
      </PropertyHeader>

      {isLocked && <LockMessage />}

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={name}
            valid={!!name}
            onChange={(event) => updateObstacle({ name: event.target.value })}
            disabled={isLocked}
          />
        </PropertyGroup>

        <PropertyGroup label="Position">
          <NumberPropertyField
            icon={<Letter value="X" />}
            value={selected.x}
            onChange={(event) =>
              updateObstacle({ x: parseNumberValue(event.target.value, selected.x) })
            }
            disabled={isLocked}
          />
          <NumberPropertyField
            icon={<Letter value="Y" />}
            value={selected.y}
            onChange={(event) =>
              updateObstacle({ y: parseNumberValue(event.target.value, selected.y) })
            }
            disabled={isLocked}
          />
        </PropertyGroup>

        <PropertyGroup label="Size">
          <NumberPropertyField
            icon={<MoveHorizontal size={12} />}
            value={selected.width}
            min={1}
            onChange={(event) =>
              updateObstacle({
                width: parsePositiveNumberValue(event.target.value, selected.width),
              })
            }
            disabled={isLocked}
          />
          <NumberPropertyField
            icon={<MoveVertical size={12} />}
            value={selected.height}
            min={1}
            onChange={(event) =>
              updateObstacle({
                height: parsePositiveNumberValue(event.target.value, selected.height),
              })
            }
            disabled={isLocked}
          />
        </PropertyGroup>
      </section>
    </>
  );
}
