/** Shown instantly while an admin page loads its data (navigations never wait on a blank screen). */
export default function AdminLoading() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-ivory-200 motion-reduce:animate-none" />
      <div className="h-12 w-full animate-pulse rounded-full bg-white motion-reduce:animate-none" />
      <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-white motion-reduce:animate-none" />
    </div>
  );
}
