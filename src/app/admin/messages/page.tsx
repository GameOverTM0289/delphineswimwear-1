import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import MessageRow from '@/components/admin/MessageRow';
import { readAdminEmailFromCookie } from '@/lib/auth';
import { listContactMessages } from '@/lib/db/messages';
import { hasDatabase } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  if (!(await readAdminEmailFromCookie())) redirect('/admin/login');
  if (!hasDatabase()) {
    return <AdminShell><h1><em>Messages</em></h1><div className="admin-empty"><p>Database not configured.</p></div></AdminShell>;
  }
  const messages = await listContactMessages();
  return (
    <AdminShell>
      <h1><em>Messages</em></h1>
      <p style={{ color: 'var(--m)', marginBottom: 28 }}>{messages.length} messages — {messages.filter((m: any) => !m.read).length} unread.</p>
      {messages.length === 0 ? (
        <div className="admin-empty"><p>No messages yet.</p></div>
      ) : (
        <ul className="msg-list">
          {messages.map((m: any) => (
            <MessageRow key={m.id} id={m.id} name={m.name} email={m.email} subject={m.subject} message={m.message} read={m.read} createdAt={m.createdAt.toISOString()} />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
