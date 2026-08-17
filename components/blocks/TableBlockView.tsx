import Link from "next/link";
import type { TableBlock } from "@/lib/types";

export function TableBlockView({ block }: { block: TableBlock }) {
  const { columns, rows } = block.content;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 text-slate-800">
                  {cell.kind === "link" && cell.href ? (
                    cell.href.startsWith("/") ? (
                      <Link href={cell.href} className="text-indigo-600 hover:underline">
                        {cell.value}
                      </Link>
                    ) : (
                      <a href={cell.href} className="text-indigo-600 hover:underline">
                        {cell.value}
                      </a>
                    )
                  ) : cell.kind === "badge" ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {cell.value}
                    </span>
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
