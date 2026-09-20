/**
 * Resolves a path under public/ against the base path the app is served from.
 *
 * Vite rewrites asset URLs it finds in HTML and CSS, but a path written as a
 * string literal in a component is opaque to the bundler, so "/assets/..."
 * ships verbatim and 404s anywhere the app does not sit at the domain root.
 * BASE_URL is "/" for the main deploy and "/<repo>/" for the GitHub Pages
 * mirror, which is the only place the two differ.
 */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
