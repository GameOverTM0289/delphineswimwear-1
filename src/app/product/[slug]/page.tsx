import { notFound } from 'next/navigation';
import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import ProductDetailClient from '@/components/product/ProductDetailClient';
import { getProductBySlug, getAllProducts } from '@/lib/db/products';

interface Props {
  params: Promise<{ slug: string }>;
}

// Revalidate every 30 seconds. Stock changes made in admin will be
// reflected on the live product page within this window.
export const revalidate = 30;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: 'Product not found' };
  return {
    title: p.name,
    description: p.description,
  };
}

export async function generateStaticParams() {
  try {
    const all = await getAllProducts();
    return all.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <section className="product-detail">
          <ProductDetailClient product={product} />
        </section>
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
