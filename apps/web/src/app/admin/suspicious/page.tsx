'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

type Config = {
  noShowThreshold: number;
  noShowDays: number;
  cancellationThreshold: number;
  cancellationDays: number;
  minRating: number;
  minRatedRides: number;
  openComplaintsThreshold: number;
  sosThreshold: number;
};

type FlaggedUser = {
  userId: string;
  fullName: string;
  trid?: string | null;
  email: string;
  accountStatus: string;
  flags: string[];
};

const RULE_FIELDS: { key: keyof Config; label: string; hint: string; step: number }[] = [
  { key: 'noShowThreshold',        label: 'No-show count',          hint: 'triggers ≥ N no-shows',              step: 1 },
  { key: 'noShowDays',             label: 'No-show window (days)',  hint: 'lookback period',                     step: 1 },
  { key: 'cancellationThreshold',  label: 'Cancellation count',     hint: 'triggers ≥ N cancellations',         step: 1 },
  { key: 'cancellationDays',       label: 'Cancellation window (days)', hint: 'lookback period',                step: 1 },
  { key: 'minRating',              label: 'Low rating threshold',   hint: 'triggers if avg rating < N',         step: 0.1 },
  { key: 'minRatedRides',          label: 'Min rides for rating',   hint: 'ignore rating until ≥ N rides',      step: 1 },
  { key: 'openComplaintsThreshold',label: 'Open complaints',        hint: 'triggers ≥ N open complaints',       step: 1 },
  { key: 'sosThreshold',           label: 'SOS event count',        hint: 'triggers ≥ N SOS events triggered',  step: 1 },
];

export default function SuspiciousPage() {
  const router = useRouter();
  const [users, setUsers] = useState<FlaggedUser[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [draft, setDraft] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getSuspiciousUsers().then((r) => {
      setUsers(r.data?.users ?? []);
      const cfg = r.data?.config ?? null;
      setConfig(cfg);
      setDraft(cfg ? { ...cfg } : null);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateDraft = (key: keyof Config, val: string) => {
    setDraft(d => d ? { ...d, [key]: parseFloat(val) || 0 } : d);
    setDirty(true);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await adminApi.setSuspiciousRulesConfig(draft as unknown as Record<string, number>);
      setConfig({ ...draft });
      setDirty(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDraft(config ? { ...config } : null);
    setDirty(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Suspicious Activity</h1>
        <div className="flex items-center gap-2">
          {users.length > 0 && (
            <span className="text-sm bg-red-100 text-red-700 font-semibold px-3 py-1 rounded-full">
              {users.length} flagged
            </span>
          )}
          <button
            onClick={() => setSettingsOpen(o => !o)}
            className={`text-sm px-3 py-2 rounded-lg border transition ${settingsOpen ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            ⚙️ Detection Rules
          </button>
        </div>
      </div>

      {/* ── Rule editor ── */}
      {settingsOpen && draft && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Detection Rules — adjust thresholds</h2>
            {dirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RULE_FIELDS.map(({ key, label, hint, step }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block">{label}</label>
                <input
                  type="number"
                  min={0}
                  step={step}
                  value={draft[key]}
                  onChange={(e) => updateDraft(key, e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <p className="text-xs text-gray-400">{hint}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : 'Save & Re-run'}
            </button>
            <button
              onClick={reset}
              disabled={!dirty}
              className="text-sm text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ── Flagged users ── */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Running detection…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-medium text-gray-600">No suspicious users detected</p>
          <p className="text-sm text-gray-400 mt-1">All users are within the configured thresholds</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['User', 'Email', 'Status', 'Flags'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr
                    key={u.userId}
                    onClick={() => router.push(`/admin/users/${u.userId}`)}
                    className="hover:bg-red-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{u.fullName}{u.trid && <span className="text-xs text-brand-600 font-mono ml-1">({u.trid})</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{u.accountStatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.flags.map((f) => (
                          <span key={f} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {users.map((u) => (
              <div
                key={u.userId}
                onClick={() => router.push(`/admin/users/${u.userId}`)}
                className="bg-white rounded-xl border border-red-200 p-4 cursor-pointer active:bg-red-50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{u.fullName}{u.trid && <span className="text-xs text-brand-600 font-mono ml-1">({u.trid})</span>}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <span className="shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{u.accountStatus}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {u.flags.map((f) => (
                    <span key={f} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
