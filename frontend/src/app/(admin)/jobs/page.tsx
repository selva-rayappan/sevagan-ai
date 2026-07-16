'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { X } from 'lucide-react';

interface Job {
  id: string;
  jobNumber: string;
  status: string;
  location: string;
  createdAt: string;
  customer: { name: string | null; phone: string };
  serviceCategory: { name: string };
  assignment: { technician: { name: string; phone: string } } | null;
}

interface Technician {
  id: string;
  name: string;
  phone: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-blue-50 text-blue-700',
  ACCEPTED: 'bg-indigo-50 text-indigo-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

const ALL_STATUSES = ['NEW', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const ASSIGNABLE_STATUSES = ['NEW', 'ASSIGNED', 'ACCEPTED'];

function AssignModal({
  job,
  onClose,
  onAssigned,
}: {
  job: Job;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/api/v1/admin/technicians?limit=100').then((r) => setTechnicians(r.data.data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!technicianId) return;
    setLoading(true);
    setError('');
    try {
      await apiClient.post(`/api/v1/admin/jobs/${job.id}/assign`, { technicianId });
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to assign job');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">Assign Job</h2>
            <p className="text-xs text-gray-500 mt-0.5">{job.jobNumber} — {job.serviceCategory.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Technician</label>
            <select
              required
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a technician…</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.phone} ({t.status})</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !technicianId}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<Job | null>(null);
  const limit = 20;

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set('status', statusFilter);
    apiClient
      .get(`/api/v1/admin/jobs?${params}`)
      .then((r) => {
        setJobs(r.data.data);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, statusFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total jobs</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Job #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Technician</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">No jobs found</td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{j.jobNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{j.customer.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{j.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{j.serviceCategory.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[j.status] ?? ''}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{j.assignment?.technician.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{j.location}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(j.createdAt)}</td>
                  <td className="px-4 py-3">
                    {ASSIGNABLE_STATUSES.includes(j.status) && (
                      <button
                        onClick={() => setAssigning(j)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50"
                      >
                        Assign
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {assigning && (
        <AssignModal job={assigning} onClose={() => setAssigning(null)} onAssigned={load} />
      )}
    </div>
  );
}
