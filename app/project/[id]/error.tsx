"use client";

import Link from "next/link";

export default function ProjectError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6"><h1 className="text-lg font-semibold text-rose-900">This project could not load</h1><p role="alert" className="mt-2 text-sm text-rose-800">{error.message}</p><div className="mt-5 flex gap-3"><button type="button" onClick={reset} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white">Try again</button><Link href="/" className="px-4 py-2 text-sm text-rose-800">All projects</Link></div></div>;
}
