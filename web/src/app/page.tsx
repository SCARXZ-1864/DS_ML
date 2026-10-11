export default function Home() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Customer Review Intelligence</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Sentiment trends, discovered topics, aspect-level sentiment and a chat that answers
        questions with citations to real reviews. Under construction: milestone M0.
      </p>
      <p className="text-sm text-zinc-500">
        Service status: <a className="underline" href="/api/health">/api/health</a>
      </p>
    </main>
  );
}
