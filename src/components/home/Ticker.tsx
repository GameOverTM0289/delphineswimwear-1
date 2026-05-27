import React from 'react';

// Doubled the vocabulary so each copy is wider than the viewport on
// even very large monitors. Without this, on wide desktops the moving
// strip would leave visible gaps between repetitions.
const WORDS: Array<{ text: string; italic?: boolean }> = [
  { text: 'Eleganza', italic: true },
  { text: 'Freedom' },
  { text: 'Comfort', italic: true },
  { text: 'Mediterranean' },
  { text: 'Naturale', italic: true },
  { text: 'Grace' },
  { text: 'Sun-Kissed', italic: true },
  { text: 'Eleganza', italic: true },
  { text: 'Freedom' },
  { text: 'Comfort', italic: true },
  { text: 'Mediterranean' },
  { text: 'Naturale', italic: true },
  { text: 'Grace' },
  { text: 'Sun-Kissed', italic: true },
];

// One copy of the content as JSX. We render it twice in the DOM so the
// CSS animation (translateX 0 → -50%) loops seamlessly.
function TickerCopy({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="ticker-copy" aria-hidden={ariaHidden || undefined}>
      {WORDS.map((w, i) => (
        <React.Fragment key={i}>
          <span className="ticker-word">
            {w.italic ? <em>{w.text}</em> : w.text}
          </span>
          <span className="sep">·</span>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Ticker() {
  return (
    <div className="ticker" aria-label="Brand values">
      <div className="ticker-track">
        <TickerCopy />
        <TickerCopy ariaHidden />
      </div>
    </div>
  );
}
