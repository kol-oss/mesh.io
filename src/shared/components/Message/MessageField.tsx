import type { FieldStructure } from "@/shared/types/common/field";

type MessageFieldProps = {
  field: FieldStructure;
};

export default function MessageField({ field }: MessageFieldProps) {
  const { label, value, bits, description, blocked } = field;
  return (
    <>
      <div
        key={label}
        className={`simulation-panel__packet-field${blocked ? " simulation-panel__packet-field--blocked" : ""}`}
        style={{ flex: bits }}
      >
        <span className="simulation-panel__packet-field-label">{label}</span>
        <span className="simulation-panel__packet-field-value">{value}</span>
        <span className="simulation-panel__packet-tooltip" role="tooltip">
          <span className="simulation-panel__packet-tooltip-description">{description}</span>
          <span className="simulation-panel__packet-tooltip-bits">
            {bits} {"bits"}
          </span>
          {blocked ? (
            <span className="simulation-panel__packet-tooltip-note">{"Not modeled"}</span>
          ) : null}
        </span>
      </div>
    </>
  );
}
