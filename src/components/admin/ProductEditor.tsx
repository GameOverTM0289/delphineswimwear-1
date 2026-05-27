'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
}

export default function ProductEditor({ product }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    priceCents: product.priceCents,
    badge: product.badge ?? '',
    mainImage: product.mainImage,
    altImage: product.altImage,
    swatchHex: product.swatchHex,
    active: true, // not exposed on Product type yet — defaults to true
    featured: product.featured,
    sortOrder: 0,
  });
  const [stock, setStock] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    product.sizes.forEach((s) => {
      const v = product.variants.find((vv) => vv.size === s);
      map[s] = v?.stock ?? 0;
    });
    return map;
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const onSaveDetails = async () => {
    setSavingDetails(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${product.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          subtitle: form.subtitle,
          description: form.description,
          priceCents: Number(form.priceCents),
          badge: form.badge || null,
          mainImage: form.mainImage,
          altImage: form.altImage,
          swatchHex: form.swatchHex,
          featured: form.featured,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setMsg({ type: 'ok', text: 'Saved.' });
      router.refresh();
    } catch {
      setMsg({ type: 'err', text: 'Failed to save.' });
    } finally {
      setSavingDetails(false);
    }
  };

  const onSaveStock = async () => {
    setSavingStock(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${product.slug}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      });
      if (!res.ok) throw new Error('save failed');
      setMsg({ type: 'ok', text: 'Stock updated.' });
      router.refresh();
    } catch {
      setMsg({ type: 'err', text: 'Failed to save stock.' });
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <>
      <h1 style={{ fontSize: 26, fontWeight: 300 }}>{product.name}</h1>
      <p style={{ color: 'var(--m)', marginBottom: 28, fontSize: 14 }}>{product.slug}</p>

      <div className="admin-grid">
        <div>
          <div className="admin-card">
            <h3>Details</h3>
            <div className="admin-form">
              <label className="lab">Name</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} />

              <label className="lab">Subtitle</label>
              <input value={form.subtitle} onChange={(e) => update('subtitle', e.target.value)} />

              <label className="lab">Description</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={5} />

              <label className="lab">Price (cents)</label>
              <input
                type="number"
                value={form.priceCents}
                onChange={(e) => update('priceCents', e.target.value)}
              />

              <label className="lab">Badge</label>
              <input value={form.badge} onChange={(e) => update('badge', e.target.value)} placeholder="Best Seller / New / blank" />

              <label className="lab">Main image</label>
              <input value={form.mainImage} onChange={(e) => update('mainImage', e.target.value)} />

              <label className="lab">Alt (hover) image</label>
              <input value={form.altImage} onChange={(e) => update('altImage', e.target.value)} />

              <label className="lab">Swatch hex</label>
              <input value={form.swatchHex} onChange={(e) => update('swatchHex', e.target.value)} />

              <label className="check">
                <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} />
                Featured (shown on home page)
              </label>

              <button onClick={onSaveDetails} disabled={savingDetails} className="btn btn-dark">
                {savingDetails ? 'Saving…' : 'Save details'} <span className="ar">→</span>
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="admin-card">
            <h3>Stock by size</h3>
            <p style={{ color: 'var(--m)', fontSize: 13, marginBottom: 14 }}>
              Set 0 to mark a size sold out. Stock decrements automatically when an order is placed.
            </p>
            <div className="admin-form">
              {product.sizes.map((s) => (
                <div key={s} className="stock-row">
                  <span>{s}</span>
                  <input
                    type="number"
                    min={0}
                    value={stock[s] ?? 0}
                    onChange={(e) =>
                      setStock((p) => ({ ...p, [s]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                  />
                </div>
              ))}
              <button onClick={onSaveStock} disabled={savingStock} className="btn btn-dark">
                {savingStock ? 'Saving…' : 'Save stock'} <span className="ar">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {msg && <p className={`order-editor-msg ${msg.type}`}>{msg.text}</p>}
    </>
  );
}
