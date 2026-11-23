export function SetupRequired() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <h1 className="text-2xl font-semibold">Supabase is not configured</h1>
      <p className="text-muted-foreground mt-3">
        Copy <code>.env.example</code> to <code>.env.local</code> and fill in your Supabase URL and keys, then
        restart the dev server. See the README for details.
      </p>
    </div>
  );
}
