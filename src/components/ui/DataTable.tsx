import { ReactNode } from "react";
import { Skeleton } from "./Skeleton";

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading,
  emptyState,
}: {
  columns: DataTableColumn<T>[];
  data: T[] | undefined;
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  emptyState: ReactNode;
}) {
  const header = (
    <thead>
      <tr className="border-b border-maroon/10 text-left text-xs uppercase tracking-wide text-charcoal/50">
        {columns.map((col) => (
          <th key={col.header} className={`p-4 ${col.headerClassName ?? ""}`}>
            {col.header}
          </th>
        ))}
      </tr>
    </thead>
  );

  if (isLoading) {
    return (
      <table className="w-full text-sm">
        {header}
        <tbody className="divide-y divide-maroon/10">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.header} className={`p-4 ${col.cellClassName ?? ""}`}>
                  <Skeleton className="h-4 w-full max-w-[160px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (!data || data.length === 0) {
    return <div className="p-6">{emptyState}</div>;
  }

  return (
    <table className="w-full text-sm">
      {header}
      <tbody className="divide-y divide-maroon/10">
        {data.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((col) => (
              <td key={col.header} className={`p-4 ${col.cellClassName ?? ""}`}>
                {col.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
