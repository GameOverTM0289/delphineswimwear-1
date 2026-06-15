import Link from 'next/link';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/admin" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/delphine-logo.png" alt="Delphine" />
        </Link>
        <ul>
          <li><Link href="/admin">Orders</Link></li>
          <li><Link href="/admin/products">Products</Link></li>
          <li><Link href="/admin/messages">Messages</Link></li>
          <li><Link href="/admin/subscribers">Subscribers</Link></li>
          <li><Link href="/admin/analytics">Analytics</Link></li>
          <li>
            <Link href="/" target="_blank" rel="noreferrer">View Site ↗</Link>
          </li>
          <li>
            <form action="/api/admin/login" method="POST">
              <input type="hidden" name="action" value="logout" />
              <button type="submit">Log Out</button>
            </form>
          </li>
        </ul>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
