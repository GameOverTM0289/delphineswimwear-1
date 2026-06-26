'use client';

export interface ColorDraft {
  name: string;
  hex: string;
  frontImage: string;
  backImage: string;
  closeUpImage: string;
}

export const emptyColor = (): ColorDraft => ({
  name: '',
  hex: '#8FA8D4',
  frontImage: '',
  backImage: '',
  closeUpImage: '',
});

interface Props {
  value: ColorDraft[];
  onChange: (colors: ColorDraft[]) => void;
}

/**
 * Editable list of product colors. Each color carries its front, back, and an
 * optional third image (paths under /public, e.g. /assets/products/...webp).
 */
export default function ColorListEditor({ value, onChange }: Props) {
  const set = (i: number, key: keyof ColorDraft, v: string) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)));
  const add = () => onChange([...value, emptyColor()]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="color-editor">
      {value.map((c, i) => (
        <div key={i} className="color-row">
          <div className="color-row-head">
            <span className="color-swatch" style={{ background: c.hex }} aria-hidden />
            <strong>{c.name.trim() || `Color ${i + 1}`}</strong>
            {value.length > 1 && (
              <button type="button" className="color-remove" onClick={() => remove(i)}>
                Remove
              </button>
            )}
          </div>
          <div className="admin-form">
            <label className="lab">Name</label>
            <input value={c.name} onChange={(e) => set(i, 'name', e.target.value)} placeholder="Blue" />

            <label className="lab">Swatch hex</label>
            <div className="color-hex-field">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : '#8FA8D4'}
                onChange={(e) => set(i, 'hex', e.target.value)}
                aria-label="Swatch color"
              />
              <input value={c.hex} onChange={(e) => set(i, 'hex', e.target.value)} placeholder="#8FA8D4" />
            </div>

            <label className="lab">Front image</label>
            <input
              value={c.frontImage}
              onChange={(e) => set(i, 'frontImage', e.target.value)}
              placeholder="/assets/products/product-1-blue-front.webp"
            />

            <label className="lab">Back image</label>
            <input
              value={c.backImage}
              onChange={(e) => set(i, 'backImage', e.target.value)}
              placeholder="/assets/products/product-1-blue-back.webp"
            />

            <label className="lab">Third image (optional)</label>
            <input
              value={c.closeUpImage}
              onChange={(e) => set(i, 'closeUpImage', e.target.value)}
              placeholder="/assets/products/product-1-blue-close.webp"
            />
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-outline color-add" onClick={add}>
        + Add color
      </button>
    </div>
  );
}
