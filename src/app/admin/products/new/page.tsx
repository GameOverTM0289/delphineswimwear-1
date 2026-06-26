import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import ProductCreateForm from '@/components/admin/ProductCreateForm';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { hasDatabase } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');

  return (
    <AdminShell>
      <div className="admin-back">
        <a href="/admin/products">← Back to products</a>
      </div>
      <h1>
        New <em>Product</em>
      </h1>
      {!hasDatabase() ? (
        <div className="admin-empty">
          <p>
            <strong>Database not configured.</strong> Set <code>DATABASE_URL</code> to create
            products.
          </p>
        </div>
      ) : (
        <ProductCreateForm />
      )}
    </AdminShell>
  );
}
