'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

type Tab = 'overview' | 'rides' | 'ratings' | 'activity' | 'locations';

const STATUS_COLORS: Record<string, string> = {
  DRIVER_VERIFIED:    'bg-green-100 text-green-700',
  SEEKER_VERIFIED:    'bg-green-100 text-green-700',
  SUSPENDED:          'bg-red-100 text-red-700',
  BANNED:             'bg-red-200 text-red-800',
  REJECTED:           'bg-red-100 text-red-700',
  DOCUMENT_VERIFICATION_PENDING: 'bg-yellow-100 text-yellow-700',
  PERSONAL_EMAIL_PENDING:        'bg-amber-100 text-amber-700',
  DRIVER_VERIFICATION_PENDING:   'bg-purple-100 text-purple-700',
  EMAIL_VERIFICATION_PENDING:    'bg-gray-100 text-gray-600',
};

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
      <span className="text-base">{ok ? '✅' : '⬜'}</span>
      <span>{label}</span>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [savedLocs, setSavedLocs] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [actionMsg, setActionMsg] = useState('');
  const [rejReason, setRejReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendInput, setShowSuspendInput] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [trustDelta, setTrustDelta] = useState('');
  const [trustReason, setTrustReason] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      adminApi.getUser(id),
      adminApi.getUserAudit(id).catch(() => ({ data: null })),
      adminApi.getUserSavedLocations(id).catch(() => ({ data: [] })),
      adminApi.getAuditLog({ actor: id, limit: 30 }).catch(() => ({ data: { entries: [] } })),
    ]).then(([userRes, auditRes, locsRes, actRes]) => {
      setUser(userRes.data);
      setAudit(auditRes.data);
      setSavedLocs(locsRes.data ?? []);
      setActivityLog(actRes.data?.entries ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!user) return <div className="text-center py-20 text-gray-400">User not found</div>;

  const identityReq = user.verificationRequests?.find((r: any) => r.verificationType === 'IDENTITY');
  const driverReq   = user.verificationRequests?.find((r: any) => r.verificationType === 'DRIVER');

  const checks = [
    { ok: user.emailStatus === 'VERIFIED',       label: 'Official email verified' },
    { ok: !!user.personalEmail,                   label: 'Personal email set' },
    { ok: user.isPhoneVerified,                   label: 'Phone verified' },
    { ok: !!user.profilePhoto || !!identityReq?.profilePhotoUrl, label: 'Profile photo uploaded' },
    { ok: !!identityReq?.employeeIdUrl,           label: 'Company ID uploaded' },
    { ok: !!identityReq?.govtIdUrl,               label: 'Govt ID uploaded' },
    { ok: identityReq?.status === 'APPROVED',     label: 'Identity docs approved' },
    { ok: !!user.trid,                            label: `TRID assigned ${user.trid ? `(${user.trid})` : ''}` },
    { ok: !!driverReq?.drivingLicenseUrl,         label: 'Driving licence uploaded' },
    { ok: !!driverReq?.rcUrl,                  label: 'RC uploaded' },
    { ok: driverReq?.status === 'APPROVED',    label: 'Ride Giver docs approved' },
    { ok: !!user.gender,                       label: 'Gender set' },
    { ok: !!user.bloodGroup,                   label: 'Blood group set' },
    { ok: !!user.homeLocation,                 label: 'Home location set' },
    { ok: !!user.officeLocation,               label: 'Office location set' },
  ];

  const act = async (fn: () => Promise<any>) => {
    setActionMsg('');
    try { await fn(); load(); setActionMsg('✅ Done'); }
    catch (e: any) { setActionMsg(`❌ ${e.response?.data?.message ?? 'Error'}`); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="text-sm text-brand-600 hover:underline">← Back to Users</button>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {(['overview', 'rides', 'ratings', 'activity', 'locations'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition -mb-px ${
              activeTab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'overview' ? '👤 Overview' : t === 'rides' ? '🚗 Rides' : t === 'ratings' ? '⭐ Ratings' : t === 'activity' ? '📋 Activity' : '📍 Locations'}
          </button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────────── */}
      {activeTab === 'overview' && (<>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{user.fullName}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.personalEmail && <p className="text-xs text-gray-400">Personal: {user.personalEmail}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[user.accountStatus] ?? 'bg-gray-100 text-gray-600'}`}>
              {user.accountStatus}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{user.role}</span>
            {user.trid && <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-mono font-medium">{user.trid}</span>}
          </div>
        </div>
        <div className="text-right text-xs text-gray-400 space-y-1">
          <p>Trust: <span className="font-semibold text-gray-700">{user.trustScore} ({user.trustBand})</span></p>
          <p>ECO: <span className="font-semibold text-gray-700">{user.ecoPoints} pts ({user.ecoLevel})</span></p>
          <p>Joined: {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
        </div>
      </div>

      {/* Verification checklist */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Verification Checklist</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map((c) => <Check key={c.label} ok={c.ok} label={c.label} />)}
        </div>
      </div>

      {/* Verification requests */}
      {user.verificationRequests?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Verification Requests</h2>
          {user.verificationRequests.map((req: any) => (
            <div key={req.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-800">{req.verificationType} verification</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'}`}>
                  {req.status}
                </span>
              </div>

              {/* Document links */}
              <div className="flex gap-3 flex-wrap text-xs">
                {req.employeeIdUrl && <a href={req.employeeIdUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">📄 Employee ID</a>}
                {req.profilePhotoUrl && <a href={req.profilePhotoUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">🖼 Profile Photo</a>}
                {req.drivingLicenseUrl && <a href={req.drivingLicenseUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">🪪 Driving Licence</a>}
                {req.rcUrl && <a href={req.rcUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">🚗 RC</a>}
              </div>

              {req.rejectionReason && (
                <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Rejection reason: {req.rejectionReason}</p>
              )}

              {/* Approve / Reject actions */}
              {req.status === 'PENDING' && (
                <div className="space-y-2 pt-1">
                  <input
                    value={rejReason}
                    onChange={(e) => setRejReason(e.target.value)}
                    placeholder="Rejection reason (required to reject)"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(() => adminApi.reviewVerification(req.id, { decision: 'APPROVED' }))}
                      className="flex-1 bg-green-600 text-white text-sm py-1.5 rounded-lg hover:bg-green-700 transition"
                    >
                      ✅ Approve & Assign TRID
                    </button>
                    <button
                      onClick={() => { if (!rejReason.trim()) { setActionMsg('❌ Enter rejection reason'); return; } act(() => adminApi.reviewVerification(req.id, { decision: 'REJECTED', rejectionReason: rejReason })); }}
                      className="flex-1 bg-red-600 text-white text-sm py-1.5 rounded-lg hover:bg-red-700 transition"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Profile info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Profile Details</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ['Phone', user.phone || '—'],
            ['Gender', user.gender || '—'],
            ['Blood Group', user.bloodGroup || '—'],
            ['Company', user.companyName || '—'],
            ['Employee ID', user.employeeId || '—'],
            ['Home', user.homeLocation || '—'],
            ['Office', user.officeLocation || '—'],
            ['Rides Given', user.rideGiver?.totalRidesGiven ?? '—'],
            ['Rides Taken', user.rideSeeker?.totalRidesTaken ?? '—'],
            ['Avg Rating (Giver)', user.rideGiver?.averageRating?.toFixed(1) ?? '—'],
            ['Avg Rating (Seeker)', user.rideSeeker?.averageRating?.toFixed(1) ?? '—'],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Admin actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Admin Actions</h2>

        {/* Role assignment */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Assign Role (current: <span className="font-semibold text-gray-700">{user.role}</span>)</p>
          <div className="flex gap-2 flex-wrap">
            {(['RIDE_SEEKER', 'RIDE_GIVER', 'ADMIN'] as const).map((r) => (
              <button
                key={r}
                onClick={() => act(() => adminApi.assignRole(id, r))}
                disabled={user.role === r}
                className={`text-sm px-4 py-1.5 rounded-lg border transition ${
                  user.role === r
                    ? 'bg-brand-600 text-white border-brand-600 cursor-default'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {r === 'RIDE_SEEKER' ? '🧳 Ride Seeker Only' : r === 'RIDE_GIVER' ? '🚗 Ride Giver / Seeker' : '🛡 Admin'}
              </button>
            ))}
          </div>
        </div>

        {/* Account status actions — contextual based on current status */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Account Status Actions</p>

          {/* Active accounts — can suspend, reject, or deactivate */}
          {!['SUSPENDED', 'DEACTIVATED', 'BANNED', 'REJECTED'].includes(user.accountStatus) && (
            <div className="space-y-2">
              {/* Suspend with reason */}
              {!showSuspendInput ? (
                <button onClick={() => setShowSuspendInput(true)}
                  className="text-sm bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg hover:bg-amber-100 transition w-full text-left">
                  🚫 Suspend Account
                </button>
              ) : (
                <div className="space-y-2">
                  <input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Reason for suspension (required)"
                    className="w-full text-sm border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <div className="flex gap-2">
                    <button onClick={() => { if (!suspendReason.trim()) { setActionMsg('❌ Enter reason'); return; } act(() => adminApi.suspendUser(id)); setShowSuspendInput(false); setSuspendReason(''); }}
                      className="flex-1 text-sm bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition">
                      Confirm Suspend
                    </button>
                    <button onClick={() => { setShowSuspendInput(false); setSuspendReason(''); }}
                      className="text-sm text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reject with reason */}
              {!showRejectInput ? (
                <button onClick={() => setShowRejectInput(true)}
                  className="text-sm bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition w-full text-left">
                  ❌ Reject Account
                </button>
              ) : (
                <div className="space-y-2">
                  <input value={rejReason} onChange={(e) => setRejReason(e.target.value)}
                    placeholder="Reason for rejection (required)"
                    className="w-full text-sm border border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400" />
                  <div className="flex gap-2">
                    <button onClick={() => { if (!rejReason.trim()) { setActionMsg('❌ Enter reason'); return; } act(() => adminApi.rejectUser(id, rejReason)); setShowRejectInput(false); setRejReason(''); }}
                      className="flex-1 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
                      Confirm Reject
                    </button>
                    <button onClick={() => { setShowRejectInput(false); setRejReason(''); }}
                      className="text-sm text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Deactivate */}
              <button onClick={() => { if (confirm('Permanently deactivate this account?')) act(() => adminApi.deactivateUser(id)); }}
                className="text-sm bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 transition w-full text-left">
                ⛔ Deactivate Account
              </button>
            </div>
          )}

          {/* Suspended / Rejected / Deactivated — can reinstate */}
          {['SUSPENDED', 'REJECTED', 'DEACTIVATED'].includes(user.accountStatus) && (
            <button onClick={() => act(() => adminApi.reinstateUser(id))}
              className="text-sm bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg hover:bg-green-100 transition w-full text-left">
              ✅ Reinstate Account
            </button>
          )}

          {user.accountStatus === 'BANNED' && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              🔴 Account permanently banned. Contact super-admin to restore.
            </p>
          )}
        </div>

        {/* Trust score adjustment */}
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Trust Score Adjustment <span className="normal-case font-normal">(current: {user.trustScore} · {user.trustBand})</span></p>
          <div className="flex gap-2">
            <input type="number" value={trustDelta} onChange={(e) => setTrustDelta(e.target.value)}
              placeholder="+10 or -5"
              className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <input value={trustReason} onChange={(e) => setTrustReason(e.target.value)}
              placeholder="Reason for adjustment"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <button
              onClick={() => { if (!trustDelta || !trustReason.trim()) { setActionMsg('❌ Enter delta and reason'); return; } act(() => adminApi.adjustTrustScore(id, Number(trustDelta), trustReason)); setTrustDelta(''); setTrustReason(''); }}
              className="bg-brand-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-brand-700 transition">
              Apply
            </button>
          </div>
        </div>

        {actionMsg && (
          <p className={`text-sm font-medium ${actionMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{actionMsg}</p>
        )}

        {/* Danger zone — permanent delete */}
        <div className="border-t border-red-100 pt-4 space-y-2">
          <p className="text-xs text-red-500 font-medium uppercase tracking-wide">⚠️ Danger Zone</p>
          <p className="text-xs text-gray-400">Permanently deletes this user and all associated data (rides, requests, documents). Cannot be undone. Use for testing only.</p>
          <button
            onClick={async () => {
              if (!confirm(`Permanently delete "${user.fullName}" and ALL their data? This cannot be undone.`)) return;
              if (!confirm('Are you absolutely sure? This deletes rides, requests, documents, everything.')) return;
              try {
                await adminApi.deleteUser(id);
                router.replace('/admin/users');
              } catch (e: any) {
                setActionMsg(`❌ ${e.response?.data?.message ?? 'Delete failed'}`);
              }
            }}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition w-full font-medium"
          >
            🗑️ Permanently Delete User
          </button>
        </div>
      </div>

      </>)}

      {/* ── Rides tab ───────────────────────────────────────── */}
      {activeTab === 'rides' && audit && (
        <div className="space-y-4">
          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Rides Given',    value: audit.summary?.totalRidesGiven ?? 0 },
              { label: 'Rides Taken',    value: audit.summary?.totalRidesTaken ?? 0 },
              { label: 'Completed',      value: audit.summary?.completedRidesGiven ?? 0 },
              { label: 'Cancelled',      value: audit.summary?.cancelledRidesGiven ?? 0 },
              { label: 'No-shows',       value: audit.summary?.noShowCount ?? 0 },
              { label: 'Cancels (7d)',   value: audit.summary?.recentCancellationCount ?? 0 },
              { label: 'Complaints',     value: audit.summary?.openComplaints ?? 0 },
              { label: 'Ratings count',  value: audit.summary?.totalRatingsCount ?? 0 },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rides given list */}
          {audit.ridesGiven?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Recent rides given</h3>
              {audit.ridesGiven.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700 truncate">{r.originName} → {r.destinationName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rides taken list */}
          {audit.ridesTaken?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Recent ride requests</h3>
              {audit.ridesTaken.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700 truncate">{r.ride?.originName} → {r.ride?.destinationName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${r.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : r.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}

          {!audit.ridesGiven?.length && !audit.ridesTaken?.length && (
            <p className="text-center py-8 text-gray-400 text-sm">No ride history</p>
          )}
        </div>
      )}

      {/* ── Ratings tab ─────────────────────────────────────── */}
      {activeTab === 'ratings' && audit && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
            <div className="flex gap-8">
              {user.rideGiver?.averageRating != null && (
                <div>
                  <p className="text-2xl font-bold text-gray-900">{'⭐'.repeat(Math.round(user.rideGiver.averageRating))} {user.rideGiver.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">As Ride Giver</p>
                </div>
              )}
              {user.rideSeeker?.averageRating != null && (
                <div>
                  <p className="text-2xl font-bold text-gray-900">{'⭐'.repeat(Math.round(user.rideSeeker.averageRating))} {user.rideSeeker.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">As Ride Seeker</p>
                </div>
              )}
            </div>
          </div>

          {audit.ratings?.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {audit.ratings.map((r: any) => (
                <div key={r.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800">{r.rater?.fullName ?? 'Unknown'}</span>
                    <span className="text-sm font-bold text-amber-500">{'⭐'.repeat(r.score)} {r.score}/5</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 italic">"{r.comment}"</p>}
                  <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-400 text-sm">No ratings yet</p>
          )}
        </div>
      )}

      {/* ── Activity tab ────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <div className="space-y-2">
          {activityLog.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No audit activity found</p>
          ) : activityLog.map((e: any) => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded">{e.action}</span>
                  <span className="text-xs text-gray-500">{e.entityType}{e.entityId ? ` · ${e.entityId.slice(0, 12)}…` : ''}</span>
                </div>
                {e.metadata && <p className="text-xs text-gray-400 mt-0.5 truncate">{JSON.stringify(e.metadata).slice(0, 80)}</p>}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                {new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Locations tab ───────────────────────────────────── */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          {/* Home / Office from profile */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Profile locations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Home</p>
                <p className="text-sm text-gray-800">{user.homeLocation || '—'}</p>
                {user.homeLat && <p className="text-xs text-gray-400 font-mono">{user.homeLat?.toFixed(5)}, {user.homeLng?.toFixed(5)}</p>}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Office</p>
                <p className="text-sm text-gray-800">{user.officeLocation || '—'}</p>
                {user.officeLat && <p className="text-xs text-gray-400 font-mono">{user.officeLat?.toFixed(5)}, {user.officeLng?.toFixed(5)}</p>}
              </div>
            </div>
          </div>

          {/* Saved locations list */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Saved locations ({savedLocs.length})</h3>
            {savedLocs.length === 0 ? (
              <p className="text-sm text-gray-400">No saved locations</p>
            ) : savedLocs.map((loc: any) => (
              <div key={loc.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{loc.alias} {loc.isFavorite ? '⭐' : ''}</p>
                  <p className="text-xs text-gray-500 truncate">{loc.address}</p>
                  <p className="text-xs text-gray-400 font-mono">{loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</p>
                </div>
                {loc.locationType && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded shrink-0">{loc.locationType}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
