import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { listProductsForAdmin } from '@/lib/db/products';
import { hasDatabase } from '@/lib/prisma';
import { formatPriceCents } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');
  if (!hasDatabase()) {
    return (
      <AdminShell>
        <h1><em>Products</em></h1>
        <div className="admin-empty"><p><strong>Database not configured.</strong></p></div>
      </AdminShell>
    );
  }
  const products = await listProductsForAdmin();
  return (
    <AdminShell>
      <div className="admin-head-row">
        <h1><em>Products</em></h1>
        <Link href="/admin/products/new" className="btn btn-dark btn-sm">
          + New product
        </Link>
      </div>
      <p style={{ color: 'var(--m)', marginBottom: 28 }}>
        Edit product copy, price, image paths, and per-size stock. Changes go live immediately.
      </p>
      <div className="admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Featured</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => {
              const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
              return (
                <tr key={p.id}>
                  <td style={{ width: 60 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.mainImage} alt="" style={{ width: 50, height: 60, objectFit: 'cover' }} />
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                    <div style={{ color: 'var(--m)', fontSize: 11 }}>{p.subtitle}</div>
                  </td>
                  <td>{p.category}</td>
                  <td>{formatPriceCents(p.priceCents, p.currency)}</td>
                  <td>{totalStock} units</td>
                  <td>{p.featured ? '★' : '—'}</td>
                  <td><Link href={`/admin/products/${p.slug}`}>Edit</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
