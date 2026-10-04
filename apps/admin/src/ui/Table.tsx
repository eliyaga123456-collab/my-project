import type { ReactNode } from "react";

export interface Column<T> { key: string; header: string; render: (row: T) => ReactNode; className?: string; }

/** Table on wide screens, stacked card list on phones (cells show their header via data-label). */
export function Table<T>({ columns, rows, rowKey, onRowClick, caption, rowLabel }: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; caption: string; rowLabel?: (r: T) => string;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={c.className}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              className={onRowClick ? "clickable" : undefined}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c, i) => (
                <td key={c.key} data-label={c.header} className={c.className}>
                  {onRowClick && i === 0 ? (
                    <button type="button" className="row-link" onClick={(e) => { e.stopPropagation(); onRowClick(r); }} aria-label={rowLabel ? `Open ${rowLabel(r)}` : undefined}>{c.render(r)}</button>
                  ) : c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
