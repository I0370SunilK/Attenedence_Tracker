export default function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/90 backdrop-blur-md shadow-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Loading your workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app is reconnecting and restoring your session.
        </p>
      </div>
    </div>
  );
}
