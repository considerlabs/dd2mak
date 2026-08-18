export function StatusBadge({ status, label }: { status: string; label: string }) {
  const cls =
    status === "publish" ? "badge-publish" : status === "pending" ? "badge-pending" : "badge-draft";
  return <span className={`badge ${cls}`}>{label}</span>;
}
