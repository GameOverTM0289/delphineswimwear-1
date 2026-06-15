import { redirect, notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import ProductEditor from '@/components/admin/ProductEditor';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { getProductBySlug } from '@/lib/db/products';
import { hasDatabase } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');
  if (!hasDatabase()) redirect('/admin/products');
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return (
    <AdminShell>
      <div className="admin-back"><a href="/admin/products">← All products</a></div>
      <ProductEditor product={product} />
    </AdminShell>
  );
}
