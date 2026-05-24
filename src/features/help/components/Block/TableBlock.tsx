import { Table2 } from "lucide-react";

type TableBlockProps = {
  headers: string[];
  rows: string[][];
  introText?: string;
  ariaLabel?: string;
};

export default function TableBlock({
  headers,
  rows,
  introText,
  ariaLabel = "reference table",
}: TableBlockProps) {
  return (
    <div className="table-block" aria-label={ariaLabel}>
      <div className="table-block__header">
        <Table2 size={20} className="table-block__icon" />
        <h4 className="table-block__title">TABLE</h4>
      </div>
      <div className="table-block__content">
        {introText ? <p className="table-block__intro">{introText}</p> : null}
        <table className="table-block__table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={`header-${index}`} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
