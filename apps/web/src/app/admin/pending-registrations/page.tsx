'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

type PendingReg = {
  id: string;
  personalEmail: string;
  personalEmailVerified: boolean;
  fullName: string | null;
  gender: string | null;
  phone: string | null;
  companyName: string | null;
  officeEmail: string | null;
  officeEmailVerified: boolean;
  isException: boolean;
  exceptionReason: string | null;
  employeeIdUrl: string | null;
  govtIdUrl: string | null;
  selfDeclarationAccepted: boolean;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  PERSONAL_EMAIL_SENT: 'bg-gray-100 text-gray-700',
  PERSONAL_EMAIL_VERIFIED: 'bg-blue-100 text-blue-700',
  OFFICE_EMAIL_SENT: 'bg-blue-100 text-blue-700',
  OFFICE_EMAIL_VERIFIED: 'bg-blue-100 text-blue-700',
  EXCEPTION_REQUESTED: 'bg-amber-100 text-amber-700',
  DOCS_UPLOADED: 'bg-purple-100 text-purple-700',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-green-100 text-green-700',
};

export default function PendingRegistrationsPage() {
  const [regs, setRegs] = useState<PendingReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const fetchRegs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listPendingRegistrations(
        filter || undefined,
        search || undefined,
      );
      setRegs(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchRegs(); }, [filter]);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this registration? A user account will be created with a TRID.')) return;
    setProcessing(id);
    try {
      const res = await adminApi.reviewPendingRegistration(id, { decision: 'APPROVED' });
      alert(`Approved! ${res.data.message}`);
      setRegs(r => r.filter(x => x.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Approval failed.');
    }
    setProcessing('');
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { alert('Please enter a rejection reason.'); return; }
    setProcessing(id);
    try {
      await adminApi.reviewPendingRegistration(id, { decision: 'REJECTED', rejectionReason: rejectReason.trim() });
      setRegs(r => r.filter(x => x.id !== id));
      setRejectingId('');
      setRejectReason('');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Rejection failed.');
    }
    setProcessing('');
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Pending Registrations</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="border rounded-lg px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="REJECTED">Rejected</option>
          <option value="PERSONAL_EMAIL_SENT">Email Sent</option>
          <option value="PERSONAL_EMAIL_VERIFIED">Email Verified</option>
          <option value="OFFICE_EMAIL_SENT">Office Email Sent</option>
          <option value="EXCEPTION_REQUESTED">Exception</option>
        </select>
        <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" placeholder="Search by name, email, company..."
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchRegs()} />
        <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm" onClick={fetchRegs}>Search</button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : regs.length === 0 ? (
        <p className="text-gray-500 text-sm">No pending registrations found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3 font-medium">Applicant</th>
                  <th className="p-3 font-medium">Emails</th>
                  <th className="p-3 font-medium">Company</th>
                  <th className="p-3 font-medium">Documents</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regs.map(r => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{r.fullName || '—'}</div>
                      <div className="text-xs text-gray-400">{r.phone || '—'}</div>
                      <div className="text-xs text-gray-400">{r.gender || ''}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-xs">
                        <span className="text-gray-500">Personal:</span> {r.personalEmail}
                        {r.personalEmailVerified && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                      <div className="text-xs mt-1">
                        <span className="text-gray-500">Office:</span> {r.officeEmail || '—'}
                        {r.officeEmailVerified && <span className="text-green-600 ml-1">✓</span>}
                        {r.isException && <span className="text-amber-600 ml-1">🔍 Exception</span>}
                      </div>
                    </td>
                    <td className="p-3 text-xs">{r.companyName || '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {r.employeeIdUrl && <a href={r.employeeIdUrl} target="_blank" rel="noopener" className="text-brand-600 text-xs underline">Company ID</a>}
                        {r.govtIdUrl && <a href={r.govtIdUrl} target="_blank" rel="noopener" className="text-brand-600 text-xs underline">Govt ID</a>}
                        {!r.employeeIdUrl && !r.govtIdUrl && <span className="text-xs text-gray-400">—</span>}
                      </div>
                      {r.selfDeclarationAccepted && <div className="text-xs text-green-600 mt-1">✓ Self-declared</div>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status] || 'bg-gray-100 text-gray-700'}`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                      {r.isException && r.exceptionReason && (
                        <div className="text-xs text-amber-600 mt-1 max-w-[200px] truncate" title={r.exceptionReason}>
                          Reason: {r.exceptionReason}
                        </div>
                      )}
                      {r.rejectionReason && (
                        <div className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={r.rejectionReason}>
                          Rejected: {r.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500">{fmtDate(r.createdAt)}</td>
                    <td className="p-3">
                      {(r.status === 'PENDING_REVIEW' || r.status === 'REJECTED') && (
                        <div className="flex flex-col gap-1">
                          <button className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                            disabled={processing === r.id} onClick={() => handleApprove(r.id)}>
                            Approve
                          </button>
                          {rejectingId === r.id ? (
                            <div className="space-y-1">
                              <textarea className="w-full border rounded text-xs p-1" rows={2} placeholder="Rejection reason..."
                                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                              <div className="flex gap-1">
                                <button className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                                  onClick={() => handleReject(r.id)}>Reject</button>
                                <button className="px-2 py-1 border rounded text-xs"
                                  onClick={() => { setRejectingId(''); setRejectReason(''); }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button className="px-3 py-1 border border-red-300 text-red-600 rounded text-xs"
                              onClick={() => setRejectingId(r.id)}>
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {regs.map(r => (
              <div key={r.id} className="bg-white border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{r.fullName || 'Unnamed'}</div>
                    <div className="text-xs text-gray-500">{r.companyName || '—'}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status] || 'bg-gray-100 text-gray-700'}`}>
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div>Personal: {r.personalEmail} {r.personalEmailVerified && '✓'}</div>
                  <div>Office: {r.officeEmail || '—'} {r.officeEmailVerified && '✓'} {r.isException && '🔍'}</div>
                  <div>Phone: {r.phone || '—'}</div>
                </div>
                <div className="flex gap-2 text-xs">
                  {r.employeeIdUrl && <a href={r.employeeIdUrl} target="_blank" rel="noopener" className="text-brand-600 underline">Company ID</a>}
                  {r.govtIdUrl && <a href={r.govtIdUrl} target="_blank" rel="noopener" className="text-brand-600 underline">Govt ID</a>}
                </div>
                {(r.status === 'PENDING_REVIEW' || r.status === 'REJECTED') && (
                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs"
                      disabled={processing === r.id} onClick={() => handleApprove(r.id)}>Approve</button>
                    <button className="flex-1 py-1.5 border border-red-300 text-red-600 rounded text-xs"
                      onClick={() => setRejectingId(r.id)}>Reject</button>
                  </div>
                )}
                {rejectingId === r.id && (
                  <div className="space-y-1">
                    <textarea className="w-full border rounded text-xs p-2" rows={2} placeholder="Rejection reason..."
                      value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 bg-red-600 text-white rounded text-xs"
                        onClick={() => handleReject(r.id)}>Confirm Reject</button>
                      <button className="flex-1 py-1.5 border rounded text-xs"
                        onClick={() => { setRejectingId(''); setRejectReason(''); }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
