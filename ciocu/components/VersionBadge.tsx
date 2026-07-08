/** Small live-version marker (bottom-left). Sourced from package.json via next.config env. */
export default function VersionBadge() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  if (!version) return null;
  return <span className="version-badge">v{version}</span>;
}
