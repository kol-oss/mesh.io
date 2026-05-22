import { Mail } from "lucide-react";

type PacketField = {
  label: string;
  bits: number;
  description: string;
};

type PacketBlockProps = {
  rows: PacketField[][];
  totalBits?: number;
  introText?: string;
};

export default function PacketBlock({
  rows,
  totalBits = 32,
  introText = "Originator Message version 2",
}: PacketBlockProps) {
  return (
    <div className="packet-structure" aria-label="packet structure">
      <div className="packet-structure__header">
        <Mail size={18} className="packet-structure__icon" />
        <h4 className="packet-structure__title">PACKET STRUCTURE</h4>
      </div>

      <div className="packet-structure__content">
        <p className="packet-structure__intro">{introText}</p>
        <div className="packet-structure__grid">
          {rows.map((row, rowIndex) => {
            const rowBitTotal = row.reduce((sum, field) => sum + field.bits, 0);
            const normalizedRow =
              rowBitTotal < totalBits
                ? [...row, { label: "", bits: totalBits - rowBitTotal, description: "" }]
                : row;

            return (
              <div
                className="packet-structure__row"
                style={{ gridTemplateColumns: `repeat(${totalBits}, minmax(0, 1fr))` }}
                key={`row-${rowIndex}`}
              >
                {normalizedRow.map((field, fieldIndex) => {
                  const isEmpty = field.label.trim().length === 0;

                  return (
                    <div
                      className={`packet-structure__cell${isEmpty ? " packet-structure__cell--empty" : ""}`}
                      style={{ gridColumn: `span ${Math.max(1, field.bits)}` }}
                      key={`row-${rowIndex}-field-${fieldIndex}`}
                      tabIndex={isEmpty ? undefined : 0}
                    >
                      <span>{field.label}</span>
                      {isEmpty ? null : (
                        <span className="packet-structure__tooltip" role="tooltip">
                          <span className="packet-structure__tooltip-description">
                            {field.description}
                          </span>
                          <span className="packet-structure__tooltip-bits">{field.bits} bits</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
