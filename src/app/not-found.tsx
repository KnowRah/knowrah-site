export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-serif text-primary">Page not found</h1>
        <p className="text-light/70">The path you followed has no pulse.</p>
        <a href="/" className="inline-block mt-2 px-4 py-2 rounded-lg border border-light/20 hover:bg-accent hover:text-white">
          Return home
        </a>
      </div>
    </main>
  );
}
