import Link from 'next/link';

export default function CampaignBand() {
  return (
    <Link href="/shop" className="band">
      <span className="l">
        <em>Summer Collection 2026</em> — Now Available
      </span>
      <span className="r">Shop All →</span>
    </Link>
  );
}
