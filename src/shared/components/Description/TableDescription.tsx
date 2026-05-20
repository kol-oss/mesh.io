type TableDescriptionProps = {
  headers: string[];
  rows: React.ReactNode[][];
};

export default function TableDescription({ headers, rows }: TableDescriptionProps) {
  return (
    <>
      <table className="simulation-panel__table-view">
        <thead>
          <tr>
            {headers.map((header, index) => (
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
