'use client';

import { useState } from 'react';

interface Props {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function MessageRow({ id, name, email, subject, message, read: initialRead, createdAt }: Props) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(initialRead);

  const onToggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !read) {
      try {
        const res = await fetch(`/api/admin/messages/${id}/read`, { method: 'PATCH' });
        if (res.ok) setRead(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <li className={`msg-row ${read ? 'read' : 'unread'}`}>
      <button onClick={onToggle} className="msg-head">
        <span className="msg-from">
          {!read && <span className="msg-dot" />}
          <strong>{name}</strong> <span className="msg-email">&lt;{email}&gt;</span>
        </span>
        <span className="msg-subj">{subject || 'No subject'}</span>
        <span className="msg-date">{new Date(createdAt).toLocaleDateString()}</span>
      </button>
      {open && (
        <div className="msg-body">
          <p>{message}</p>
          <p className="msg-meta">
            <a href={`mailto:${email}?subject=Re:%20${encodeURIComponent(subject ?? '')}`}>Reply by email</a>
          </p>
        </div>
      )}
    </li>
  );
}
