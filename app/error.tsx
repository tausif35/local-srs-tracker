"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="mx-auto max-w-xl px-4 py-16"><h1 className="text-xl font-semibold text-slate-900">SRS Tracker could not load</h1><p role="alert" className="mt-2 text-sm text-slate-600">{error.message}</p><button type="button" onClick={reset} className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Try again</button></main>;
}
