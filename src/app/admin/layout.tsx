// Empty pass-through layout. Auth & shell are enforced per-page so the
// login page can render without the admin sidebar.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
