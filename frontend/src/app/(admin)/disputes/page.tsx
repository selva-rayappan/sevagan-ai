'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

interface Dispute {
  id: string;
  status: string;
  customerAmount: string;
  technicianAmount: string;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  job: {
    jobNumber: string;
    customer: { name: string | null; phone: string };
    assignment: { technician: { name: string; phone: string } } | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  ESCALATED: 'bg-orange-50 text-orange-700',
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [resolving, setResolving] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    apiClient.get(`/api/v1/admin/disputes${params}`).then((r) => setDisputes(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  async function resolve(id: string) {
    const notes = prompt('Resolution notes (optional):') ?? undefined;
    setResolving(id);
    try {
      await apiClient.post(`/api/v1/admin/disputes/${id}/resolve`, { notes });
      load();
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Disputes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{disputes.length} {statusFilter.toLowerCase()} disputes</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Job #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Technician</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer Said</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tech Said</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Raised</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : disputes.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No disputes found</td></tr>
            ) : (
              disputes.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.job.jobNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{d.job.customer.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{d.job.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{d.job.assignment?.technician.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(Number(d.customerAmount))}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(Number(d.technicianAmount))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[d.status] ?? ''}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3">
                    {d.status === 'OPEN' && (
                      <button
                        onClick={() => resolve(d.id)}
                        disabled={resolving === d.id}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {resolving === d.id ? '…' : 'Resolve'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
