type TableDescriptionProps = {
  fontSize?: number;
  headers?: string[];
  rows: React.ReactNode[][];
};

export default function TableDescription({ fontSize, headers, rows }: TableDescriptionProps) {
  return (
    <>
      <table className="simulation-panel__table-view" style={{ fontSize }}>
        <thead>
          <tr>
            {headers?.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((_, index) => (
            <tr key={index}>
              {rows[index].map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
