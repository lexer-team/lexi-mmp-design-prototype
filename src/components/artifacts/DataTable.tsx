import { cn } from "@/lib/utils";
import type { TableRow } from "@/data/mock";

interface DataTableProps {
  cols: string[];
  rows: TableRow[];
  maxRows?: number;
}

export function DataTable({ cols, rows, maxRows }: DataTableProps) {
  const visible = maxRows ? rows.slice(0, maxRows) : rows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {cols.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-border/50 hover:bg-muted/30 transition-colors",
                i === visible.length - 1 && "border-0",
              )}
            >
              {cols.map((col) => (
                <td key={col} className="px-3 py-2 text-foreground whitespace-nowrap">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
