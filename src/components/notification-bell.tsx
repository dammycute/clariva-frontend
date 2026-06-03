'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface Activity {
  id: number; action: string; model_name: string;
  object_repr: string | null; user_name: string | null;
  created_at: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.audit.list({}).then(data => {
      setActivities((data as Activity[]).slice(0, 10));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const actionEmoji: Record<string, string> = {
    created: '➕', updated: '✏️', deleted: '🗑',
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="text-[#64748B] hover:text-[#0D2B55] text-lg relative">
        🔔
        {activities.filter(a => a.action === 'created').length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#B91C1C] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {activities.filter(a => a.action === 'created').length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#DDE5F0] rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#DDE5F0]">
            <p className="text-xs font-bold text-[#0D2B55]">Recent Activity</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#64748B]">No recent activity</div>
            ) : (
              activities.map(a => (
                <div key={a.id} className="px-4 py-2.5 hover:bg-[#F8FAFF] border-b border-[#DDE5F0] last:border-b-0">
                  <div className="flex items-start gap-2">
                    <span className="text-sm">{actionEmoji[a.action] || '📌'}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#0D2B55]">
                        <strong>{a.user_name || 'System'}</strong> {a.action} {a.model_name}
                        {a.object_repr && <span className="text-[#64748B]">: {a.object_repr}</span>}
                      </p>
                      <p className="text-[10px] text-[#64748B] mt-0.5">
                        {new Date(a.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
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
