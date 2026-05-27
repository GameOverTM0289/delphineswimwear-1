import Announcement from '@/components/layout/Announcement';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import Ticker from '@/components/home/Ticker';
import Origin from '@/components/home/Origin';
import CollectionGrid from '@/components/home/CollectionGrid';
import CampaignBand from '@/components/home/CampaignBand';
import Mission from '@/components/home/Mission';
import LookbookGrid from '@/components/home/LookbookGrid';
import Philosophy from '@/components/home/Philosophy';
import BestSellers from '@/components/home/BestSellers';
import CTA from '@/components/home/CTA';
import CartDrawer from '@/components/cart/CartDrawer';
import { getFeaturedProducts } from '@/lib/db/products';

// Revalidate so featured-product and stock changes appear within 30s.
export const revalidate = 30;

export default async function HomePage() {
  const featured = await getFeaturedProducts(3);

  return (
    <>
      <Announcement />
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <Origin />
        <CollectionGrid />
        <CampaignBand />
        <Mission />
        <LookbookGrid />
        <Philosophy />
        <BestSellers products={featured} />
        <CTA />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
