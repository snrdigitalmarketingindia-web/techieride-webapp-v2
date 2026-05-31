'use client';

import { useEffect, useState, useRef } from 'react';
import { notificationsApi } from '@/lib/api';
import { connectSocket, WsEvents } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

const TYPE_ICONS: Record<string, string> = {
  RIDE_APPROVED: '🚗', RIDE_REJECTED: '❌', RIDE_CONFIRMED: '🎉',
  RIDE_STARTED: '▶️', RIDE_COMPLETED: '✅', RIDE_CANCELLED: '🚫',
  REQUEST_APPROVED: '✅', REQUEST_REJECTED: '❌',
  HOLD_EXPIRING: '⏰', HOLD_EXPIRED: '⌛',
  VERIFICATION_APPROVED: '🎉', VERIFICATION_REJECTED: '❌',
  SOS_ALERT: '🆘', GENERIC: '🔔',
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function NotificationDrawer() {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await notificationsApi.getAll({ limit: 20 });
      setNotifications(data.data);
      setUnread(data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    load();

    // Real-time notifications via WebSocket
    const socket = connectSocket();
    socket.on(WsEvents.NOTIFICATION_NEW, (notif: any) => {
      setNotifications(prev => [notif, ...prev].slice(0, 20));
      setUnread(prev => prev + 1);
    });

    // Poll every 30s as fallback
    const interval = setInterval(load, 30000);

    return () => {
      socket.off(WsEvents.NOTIFICATION_NEW);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900 text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <div className="text-3xl mb-1">🔔</div>
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${!n.isRead ? 'bg-brand-50' : ''}`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
