'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@/lib/types';
import { dhlTrackingUrl, formatPriceCents } from '@/lib/utils';

interface Props {
  id: string;
  status: OrderStatus;
  trackingNumber: string;
  trackingUrl: string;
  notes: string;
  // Payment context — drives the refund control.
  paymentStatus: string;
  paymentRef: string | null;
  totalCents: number;
  currency: string;
  /** True when POK credentials are configured on the server. */
  pokConfigured: boolean;
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
  paymentStatus: initialPaymentStatus,
  paymentRef,
  totalCents,
  currency,
  pokConfigured,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl);
  const [notes, setNotes] = useState(initialNotes);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Refund state
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [refunding, setRefunding] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundNotify, setRefundNotify] = useState(true);
  const [refundMsg, setRefundMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
        text: data.emailQueued ? 'Saved. Customer notified by email.' : 'Saved.',
      });
      router.refresh();
    } catch (err) {
      setMsg({ type: 'err', text: 'Failed to save. Please try again.' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const onRefund = async () => {
    setRefunding(true);
    setRefundMsg(null);
    try {
      const res = await fetch(`/api/orders/${id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason.trim() || undefined, notify: refundNotify }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const text =
          data.message ??
          (data.error === 'PAYMENTS_NOT_CONFIGURED'
            ? 'POK is not configured on the server.'
            : data.error === 'ALREADY_REFUNDED'
              ? 'This order is already refunded.'
              : 'Action failed. Please try again or check POK.');
        throw new Error(text);
      }
      setConfirmRefund(false);
      // The server decides refund vs cancel based on the true POK status.
      if (data.action === 'refunded') {
        setPaymentStatus('refunded');
        setStatus('cancelled');
        setRefundMsg({
          type: 'ok',
          text:
            data.emailResult === 'sent'
              ? 'Refunded. Customer notified by email.'
              : 'Refunded.',
        });
      } else {
        // Unpaid order was cancelled — no money moved, no refund email.
        setPaymentStatus('failed');
        setStatus('cancelled');
        setRefundMsg({
          type: 'ok',
          text: 'Order was not paid, so it was cancelled. No refund needed and no email sent.',
        });
      }
      router.refresh();
    } catch (err) {
      setRefundMsg({ type: 'err', text: (err as Error).message });
      console.error(err);
    } finally {
      setRefunding(false);
    }
  };

  const isRefunded = paymentStatus === 'refunded';
  const canRefund = pokConfigured && Boolean(paymentRef) && !isRefunded;

  // ── Sync with POK ─────────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const onSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/orders/${id}/sync`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error === 'PAYMENTS_NOT_CONFIGURED'
            ? 'POK is not configured on the server.'
            : 'Sync failed. Please try again.',
        );
      }
      if (data.changed) {
        setPaymentStatus(data.paymentStatus);
        setSyncMsg({ type: 'ok', text: `Updated — payment is now "${data.paymentStatus}".` });
        router.refresh();
      } else if (!data.checked) {
        setSyncMsg({ type: 'err', text: data.note ? `Couldn't sync: ${data.note}.` : 'Nothing to sync.' });
      } else {
        setSyncMsg({ type: 'ok', text: `Already up to date — payment is "${data.paymentStatus}".` });
      }
    } catch (err) {
      setSyncMsg({ type: 'err', text: (err as Error).message });
    } finally {
      setSyncing(false);
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

      <label className="lab">DHL tracking number</label>
      <input
        type="text"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
        placeholder="e.g. JD0002000012345678"
      />
      {trackingNumber.trim() && (
        <p className="track-preview">
          Customer will track at{' '}
          <a href={dhlTrackingUrl(trackingNumber)} target="_blank" rel="noreferrer">
            DHL Track &amp; Trace ↗
          </a>
        </p>
      )}

      <label className="lab">Tracking URL (optional override)</label>
      <input
        type="url"
        value={trackingUrl}
        onChange={(e) => setTrackingUrl(e.target.value)}
        placeholder="Leave blank to use DHL"
      />
      {status === 'shipped' && !trackingNumber.trim() && (
        <p className="track-preview track-warn">
          Tip: add the DHL tracking number so the shipped email includes a track button.
        </p>
      )}

      <label className="lab">Internal notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Notes only visible to you"
      />

      <label className="check">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Email customer when status changes
      </label>

      <button type="button" onClick={onSave} disabled={saving} className="btn btn-dark">
        {saving ? 'Saving…' : 'Save'} <span className="ar">→</span>
      </button>

      {msg && <p className={`order-editor-msg ${msg.type}`}>{msg.text}</p>}

      {/* ── Sync payment with POK ──────────────────────────────────── */}
      {pokConfigured && paymentRef && (
        <div className="sync-section">
          <div className="sync-row">
            <div>
              <h4 className="refund-title" style={{ margin: 0 }}>Payment sync</h4>
              <p className="refund-note" style={{ margin: '6px 0 0' }}>
                Pulls the latest status from POK. Runs automatically when you open an
                order; use this to re-check on demand.
              </p>
            </div>
            <button type="button" className="btn btn-outline" onClick={onSync} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync with POK'}
            </button>
          </div>
          {syncMsg && <p className={`order-editor-msg ${syncMsg.type}`}>{syncMsg.text}</p>}
        </div>
      )}

      {/* ── Refund / Cancel ────────────────────────────────────────── */}
      <div className="refund-section">
        <h4 className="refund-title">
          {paymentStatus === 'paid' ? 'Refund' : 'Cancel order'}
        </h4>

        {isRefunded ? (
          <p className="refund-note refund-done">This order has been refunded.</p>
        ) : !pokConfigured ? (
          <p className="refund-note">POK isn&rsquo;t configured, so this isn&rsquo;t available here.</p>
        ) : !paymentRef ? (
          <p className="refund-note">
            No POK payment is attached to this order, so there&rsquo;s nothing to refund or cancel.
          </p>
        ) : !confirmRefund ? (
          <>
            <p className="refund-note">
              {paymentStatus === 'paid'
                ? `Refund the full ${formatPriceCents(totalCents, currency)} to the customer via POK. They will be notified by email.`
                : paymentStatus === 'failed'
                  ? `This payment failed — no money was charged. You can cancel the order to close it out. No refund or email is sent.`
                  : `This order hasn't been paid yet. Cancelling closes the POK payment so the customer can't still pay it. No money has moved, so no refund or email is sent.`}
            </p>
            <button
              type="button"
              className="btn btn-outline btn-danger"
              onClick={() => {
                setConfirmRefund(true);
                setRefundMsg(null);
              }}
              disabled={!canRefund}
            >
              {paymentStatus === 'paid' ? 'Refund order' : 'Cancel order'}
            </button>
          </>
        ) : (
          <div className="refund-confirm">
            {paymentStatus === 'paid' ? (
              <>
                <label className="lab">Reason (optional — not shown to customer)</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. customer request, out of stock"
                />
                <label className="check">
                  <input
                    type="checkbox"
                    checked={refundNotify}
                    onChange={(e) => setRefundNotify(e.target.checked)}
                  />
                  Email the customer about the refund
                </label>
                <p className="refund-warn">
                  This refunds {formatPriceCents(totalCents, currency)} via POK and marks the order
                  cancelled. This can&rsquo;t be undone.
                </p>
              </>
            ) : (
              <>
                <label className="lab">Reason (optional — internal only)</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. payment failed, abandoned"
                />
                <p className="refund-warn">
                  This cancels the unpaid order via POK and marks it cancelled. No money is
                  refunded (none was charged) and no email is sent. This can&rsquo;t be undone.
                </p>
              </>
            )}
            <div className="refund-actions">
              <button
                type="button"
                className="btn btn-dark btn-danger"
                onClick={onRefund}
                disabled={refunding}
              >
                {refunding
                  ? 'Processing…'
                  : paymentStatus === 'paid'
                    ? 'Confirm refund'
                    : 'Confirm cancellation'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmRefund(false)}
                disabled={refunding}
              >
                Keep order
              </button>
            </div>
          </div>
        )}

        {refundMsg && <p className={`order-editor-msg ${refundMsg.type}`}>{refundMsg.text}</p>}
      </div>
    </div>
  );
}
