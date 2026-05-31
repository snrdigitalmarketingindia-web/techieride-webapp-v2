'use client';

import { useState, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastQueue: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

export function toast(message: string, type: Toast['type'] = 'info') {
  const id = Math.random().toString(36).slice(2);
  const t: Toast = { id, message, type };
  toastQueue = [...toastQueue, t];
  listeners.forEach((l) => l(toastQueue));
  setTimeout(() => {
    toastQueue = toastQueue.filter((x) => x.id !== id);
    listeners.forEach((l) => l(toastQueue));
  }, 3000);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast[]) => setToasts([...t]);
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  }, []);

  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-gray-800' };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`${colors[t.type]} text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-in fade-in`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
