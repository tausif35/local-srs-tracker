import type { TableBlock } from "@/lib/types";

export function TableBlockView({ block }: { block: TableBlock }) {
  const { columns, rows } = block.content;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-slate-400">
            {columns.map((col) => (
              <th key={col} className="py-2 pr-4">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-900">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-4">
                  {cell.kind === "link" && cell.href ? (
                    <a href={cell.href} className="text-indigo-400 hover:underline">
                      {cell.value}
                    </a>
                  ) : cell.kind === "badge" ? (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{cell.value}</span>
                  ) : (
                    cell.value
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
