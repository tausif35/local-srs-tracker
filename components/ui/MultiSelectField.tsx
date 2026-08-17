"use client";

import { useMemo, useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";

export interface MultiSelectOption { value: string; label: string; detail?: string; }

export function MultiSelectField({ label, options, selected, onChange, placeholder = "Search..." }: { label: string; options: MultiSelectOption[]; selected: string[]; onChange: (values: string[]) => void; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return options.filter((option) => !selected.includes(option.value) && (!normalized || `${option.value} ${option.label} ${option.detail ?? ""}`.toLowerCase().includes(normalized))).slice(0, 8);
  }, [options, query, selected]);

  return <fieldset className="text-xs font-medium text-slate-500"><legend>{label}</legend><div className="mt-1 rounded-md border border-slate-300 bg-white p-2">
    <div className="mb-2 flex flex-wrap gap-1.5">{selected.map((value) => <span key={value} className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 font-mono text-xs text-indigo-700">{value}<button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(selected.filter((item) => item !== value))}><CloseIcon className="h-3 w-3" /></button></span>)}</div>
    <label className="flex items-center gap-2"><SearchIcon className="h-4 w-4 text-slate-400" /><span className="sr-only">{placeholder}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 border-0 p-1 text-sm font-normal text-slate-900 outline-none" /></label>
    {query && <div className="mt-2 max-h-40 overflow-y-auto border-t border-slate-100 pt-1">{matches.length === 0 ? <p className="p-2 font-normal text-slate-400">No matches</p> : matches.map((option) => <button key={option.value} type="button" onClick={() => { onChange([...selected, option.value]); setQuery(""); }} className="block w-full rounded px-2 py-1.5 text-left font-normal hover:bg-slate-50"><span className="font-mono text-xs text-slate-600">{option.value}</span><span className="ml-2 text-sm text-slate-900">{option.label}</span>{option.detail && <span className="block truncate text-xs text-slate-400">{option.detail}</span>}</button>)}</div>}
  </div></fieldset>;
}
