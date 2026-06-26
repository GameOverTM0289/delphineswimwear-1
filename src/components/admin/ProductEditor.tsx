'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import ColorListEditor, { ColorDraft, emptyColor } from '@/components/admin/ColorListEditor';

interface Props {
  product: Product;
}

export default function ProductEditor({ product }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    priceEur: String(product.priceCents / 100),
    badge: product.badge ?? '',
    mainImage: product.mainImage,
    altImage: product.altImage,
    swatchHex: product.swatchHex,
    featured: product.featured,
  });
  const [stock, setStock] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    product.sizes.forEach((s) => {
      const v = product.variants.find((vv) => vv.size === s);
      map[s] = v?.stock ?? 0;
    });
    return map;
  });
  const [colors, setColors] = useState<ColorDraft[]>(() => {
    const initial = (product.colors ?? []).map((c) => ({
      name: c.name,
      hex: c.hex,
      frontImage: c.frontImage,
      backImage: c.backImage,
      closeUpImage: c.closeUpImage ?? '',
    }));
    return initial.length > 0 ? initial : [emptyColor()];
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [savingColors, setSavingColors] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/products/${product.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('save failed');
  };

  const onSaveDetails = async () => {
    const price = Number(form.priceEur);
    if (!Number.isFinite(price) || price < 0) {
      setMsg({ type: 'err', text: 'Enter a valid price.' });
      return;
    }
    setSavingDetails(true);
    setMsg(null);
    try {
      await patch({
        name: form.name,
        subtitle: form.subtitle,
        description: form.description,
        priceCents: Math.round(price * 100),
        badge: form.badge || null,
        mainImage: form.mainImage,
        altImage: form.altImage,
        swatchHex: form.swatchHex,
        featured: form.featured,
      });
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

  const onSaveColors = async () => {
    for (const [i, c] of colors.entries()) {
      if (!c.name.trim() || !/^#[0-9a-fA-F]{6}$/.test(c.hex) || !c.frontImage.trim() || !c.backImage.trim()) {
        setMsg({ type: 'err', text: `Color ${i + 1}: name, hex, front & back images are required.` });
        return;
      }
    }
    setSavingColors(true);
    setMsg(null);
    try {
      await patch({
        colors: colors.map((c) => ({
          name: c.name.trim(),
          hex: c.hex,
          frontImage: c.frontImage.trim(),
          backImage: c.backImage.trim(),
          closeUpImage: c.closeUpImage.trim() || undefined,
        })),
      });
      setMsg({ type: 'ok', text: 'Colors updated.' });
      router.refresh();
    } catch {
      setMsg({ type: 'err', text: 'Failed to save colors.' });
    } finally {
      setSavingColors(false);
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

              <label className="lab">Price (EUR)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={form.priceEur}
                onChange={(e) => update('priceEur', e.target.value)}
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

          <div className="admin-card">
            <h3>Colors &amp; images</h3>
            <p style={{ color: 'var(--m)', fontSize: 13, marginBottom: 14 }}>
              Swatches and per-color front / back / third images shown on the product page.
            </p>
            <ColorListEditor value={colors} onChange={setColors} />
            <button onClick={onSaveColors} disabled={savingColors} className="btn btn-dark" style={{ marginTop: 16 }}>
              {savingColors ? 'Saving…' : 'Save colors'} <span className="ar">→</span>
            </button>
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
