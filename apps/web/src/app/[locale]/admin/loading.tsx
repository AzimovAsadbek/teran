/** Shown instantly while an admin page loads its data (navigations never wait on a blank screen). */
export default function AdminLoading() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-10 w-72 animate-pulse rounded-control bg-surface-sunken/60 motion-reduce:animate-none" />
      <div className="h-12 w-full animate-pulse rounded-full bg-surface motion-reduce:animate-none" />
      <div className="h-96 animate-pulse rounded-card bg-surface motion-reduce:animate-none" />
    </div>
  );
}
