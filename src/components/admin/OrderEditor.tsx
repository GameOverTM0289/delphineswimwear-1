'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@/lib/types';

interface Props {
  id: string;
  status: OrderStatus;
  trackingNumber: string;
  trackingUrl: string;
  notes: string;
}

const STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export default function OrderEditor({
  id,
  status: initialStatus,
  trackingNumber: initialTracking,
  trackingUrl: initialTrackingUrl,
  notes: initialNotes,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl);
  const [notes, setNotes] = useState(initialNotes);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const onSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber, trackingUrl, notes, notify }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'save failed');
      setMsg({
        type: 'ok',
        text: data.emailQueued
          ? 'Saved. Customer notified by email.'
          : 'Saved.',
      });
      router.refresh();
    } catch (err) {
      setMsg({ type: 'err', text: 'Failed to save. Please try again.' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="order-editor">
      <label className="lab">Status</label>
      <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label className="lab">Tracking number</label>
      <input
        type="text"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
        placeholder="e.g. 1Z999AA10123456789"
      />

      <label className="lab">Tracking URL</label>
      <input
        type="url"
        value={trackingUrl}
        onChange={(e) => setTrackingUrl(e.target.value)}
        placeholder="https://…"
      />

      <label className="lab">Internal notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Notes only visible to you"
      />

      <label className="check">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
        Email customer when status changes
      </label>

      <button type="button" onClick={onSave} disabled={saving} className="btn btn-dark">
        {saving ? 'Saving…' : 'Save'} <span className="ar">→</span>
      </button>

      {msg && <p className={`order-editor-msg ${msg.type}`}>{msg.text}</p>}
    </div>
  );
}
