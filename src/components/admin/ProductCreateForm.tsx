'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ColorListEditor, { ColorDraft, emptyColor } from '@/components/admin/ColorListEditor';

const ALL_SIZES = ['S', 'M', 'L'] as const;
type Size = (typeof ALL_SIZES)[number];

export default function ProductCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    subtitle: 'Bikini Set',
    category: 'bikinis' as 'bikinis' | 'one-pieces',
    description: '',
    priceEur: '',
    badge: '',
    featured: false,
    sortOrder: '0',
  });
  const [sizes, setSizes] = useState<Record<Size, boolean>>({ S: true, M: true, L: true });
  const [stock, setStock] = useState<Record<Size, string>>({ S: '0', M: '0', L: '0' });
  const [colors, setColors] = useState<ColorDraft[]>([emptyColor()]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    const price = Number(form.priceEur);
    if (!Number.isFinite(price) || price <= 0) return 'Enter a valid price.';
    if (!ALL_SIZES.some((s) => sizes[s])) return 'Pick at least one size.';
    if (colors.length === 0) return 'Add at least one color.';
    for (const [i, c] of colors.entries()) {
      if (!c.name.trim()) return `Color ${i + 1}: name is required.`;
      if (!/^#[0-9a-fA-F]{6}$/.test(c.hex)) return `Color ${i + 1}: hex must look like #1B1916.`;
      if (!c.frontImage.trim() || !c.backImage.trim())
        return `Color ${i + 1}: front and back images are required.`;
    }
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) {
      setMsg({ type: 'err', text: err });
      return;
    }
    setSaving(true);
    setMsg(null);
    const chosen = ALL_SIZES.filter((s) => sizes[s]);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          subtitle: form.subtitle.trim() || form.category,
          category: form.category,
          description: form.description.trim() || form.name.trim(),
          priceCents: Math.round(Number(form.priceEur) * 100),
          badge: form.badge.trim() || null,
          featured: form.featured,
          sortOrder: Number(form.sortOrder) || 0,
          sizes: chosen,
          stock: Object.fromEntries(chosen.map((s) => [s, Math.max(0, Number(stock[s]) || 0)])),
          colors: colors.map((c) => ({
            name: c.name.trim(),
            hex: c.hex,
            frontImage: c.frontImage.trim(),
            backImage: c.backImage.trim(),
            closeUpImage: c.closeUpImage.trim() || undefined,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'create failed');
      setMsg({ type: 'ok', text: 'Product created.' });
      router.push(`/admin/products/${data.product.slug}`);
      router.refresh();
    } catch {
      setMsg({ type: 'err', text: 'Failed to create product. Check the fields and try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-grid">
      <div>
        <div className="admin-card">
          <h3>Details</h3>
          <div className="admin-form">
            <label className="lab">Name</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Elia — Bikini Wave" />

            <label className="lab">Subtitle</label>
            <input value={form.subtitle} onChange={(e) => update('subtitle', e.target.value)} placeholder="Bikini Set" />

            <label className="lab">Category</label>
            <select value={form.category} onChange={(e) => update('category', e.target.value)}>
              <option value="bikinis">Bikinis</option>
              <option value="one-pieces">One Pieces</option>
            </select>

            <label className="lab">Description</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={5} placeholder="A refined silhouette in soft-touch fabric…" />

            <label className="lab">Price (EUR)</label>
            <input type="number" min={0} step="1" value={form.priceEur} onChange={(e) => update('priceEur', e.target.value)} placeholder="185" />

            <label className="lab">Badge</label>
            <input value={form.badge} onChange={(e) => update('badge', e.target.value)} placeholder="Best Seller / New / blank" />

            <label className="lab">Sort order</label>
            <input type="number" min={0} value={form.sortOrder} onChange={(e) => update('sortOrder', e.target.value)} />

            <label className="check">
              <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} />
              Featured (shown on home page)
            </label>
          </div>
        </div>

        <div className="admin-card">
          <h3>Sizes &amp; stock</h3>
          <div className="admin-form">
            {ALL_SIZES.map((s) => (
              <div key={s} className="size-stock-row">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={sizes[s]}
                    onChange={(e) => setSizes((p) => ({ ...p, [s]: e.target.checked }))}
                  />
                  Size {s}
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={!sizes[s]}
                  value={stock[s]}
                  onChange={(e) => setStock((p) => ({ ...p, [s]: e.target.value }))}
                  placeholder="stock"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="admin-card">
          <h3>Colors &amp; images</h3>
          <p style={{ color: 'var(--m)', fontSize: 13, marginBottom: 14 }}>
            The first color&rsquo;s front &amp; back images become the shop card. Image paths point
            to files in <code>/public</code> (e.g. <code>/assets/products/…</code>).
          </p>
          <ColorListEditor value={colors} onChange={setColors} />
        </div>

        <button onClick={onSubmit} disabled={saving} className="btn btn-dark">
          {saving ? 'Creating…' : 'Create product'} <span className="ar">→</span>
        </button>
        {msg && <p className={`order-editor-msg ${msg.type}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
