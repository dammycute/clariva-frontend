'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface NotificationItem {
  id: string; notif_type: string; title: string;
  message: string; read: boolean; created_at: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.notifications.list().then(data => {
      const items = data as NotificationItem[];
      setNotifications(items.slice(0, 10));
      setUnreadCount(items.filter(n => !n.read).length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const typeEmoji: Record<string, string> = {
    attendance: '✅', exam: '📝', fee: '💰',
    announcement: '📢', grade: '📊', system: '⚙️',
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="text-[#64748B] hover:text-[#0D2B55] text-lg relative">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#B91C1C] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#DDE5F0] rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#DDE5F0]">
            <p className="text-xs font-bold text-[#0D2B55]">Notifications</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#64748B]">No notifications</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`px-4 py-2.5 hover:bg-[#F8FAFF] border-b border-[#DDE5F0] last:border-b-0 ${!n.read ? 'bg-[#F0F4FA]' : ''}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-sm">{typeEmoji[n.notif_type] || '📌'}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#0D2B55]">
                        <strong>{n.title}</strong>
                      </p>
                      <p className="text-[10px] text-[#64748B] mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-[#64748B] mt-0.5">
                        {new Date(n.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#1A7A4A] mt-1 flex-shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
