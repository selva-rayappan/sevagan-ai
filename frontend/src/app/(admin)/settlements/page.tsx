'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface Settlement {
  id: string;
  technicianId: string;
  grossAmount: string;
  commissionAmount: string;
  netAmount: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  technician: { name: string; phone: string };
}

function GenerateModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [form, setForm] = useState({ technicianId: '', periodStart: '', periodEnd: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/v1/admin/settlements/generate', form);
      onGenerated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to generate settlement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Generate Settlement</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Technician ID</label>
            <input required value={form.technicianId} onChange={(e) => setForm((f) => ({ ...f, technicianId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="UUID" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period Start</label>
            <input required type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period End</label>
            <input required type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Generating…' : 'Generate'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiClient.get('/api/v1/admin/settlements').then((r) => setSettlements(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function markPaid(id: string) {
    setPaying(id);
    try {
      await apiClient.post(`/api/v1/admin/settlements/${id}/pay`);
      load();
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Settlements</h1>
          <p className="text-sm text-gray-500 mt-0.5">{settlements.length} settlements</p>
        </div>
        <button onClick={() => setShowGenerate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> Generate
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Technician</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Gross</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Commission</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Net</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : settlements.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No settlements yet</td></tr>
            ) : (
              settlements.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{(s as any).technician?.name ?? s.technicianId}</p>
                    <p className="text-xs text-gray-500">{(s as any).technician?.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(Number(s.grossAmount))}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(Number(s.commissionAmount))}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(Number(s.netAmount))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    {s.status === 'PENDING' && (
                      <button
                        onClick={() => markPaid(s.id)}
                        disabled={paying === s.id}
                        className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {paying === s.id ? '…' : 'Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onGenerated={load} />}
    </div>
  );
}
