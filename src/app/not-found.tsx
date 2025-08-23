export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-serif text-primary">Page not found</h1>
        <p className="text-light/70">The path you followed has no pulse.</p>
        <a href="/" className="btn btn-ghost mt-2">Return home</a>
      </div>
    </main>
  );
}
