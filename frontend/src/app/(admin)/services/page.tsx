'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { Plus, X, Pencil, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

function FormModal({
  category,
  onClose,
  onSaved,
}: {
  category: ServiceCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: category?.name ?? '', description: category?.description ?? '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (category) {
        await apiClient.patch(`/api/v1/admin/service-categories/${category.id}`, form);
      } else {
        await apiClient.post('/api/v1/admin/service-categories', form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save service');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{category ? 'Edit Service' : 'Add Service'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Pest Control"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
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
              disabled={loading}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : category ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    apiClient
      .get('/api/v1/admin/service-categories?all=true')
      .then((r) => setCategories(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function toggleHold(category: ServiceCategory) {
    await apiClient.patch(`/api/v1/admin/service-categories/${category.id}`, { active: !category.active });
    load();
  }

  async function handleDelete(category: ServiceCategory) {
    if (!confirm(`Remove "${category.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await apiClient.delete(`/api/v1/admin/service-categories/${category.id}`);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to remove service');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} total services</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> Add Service
        </button>
      </div>

      {error && <p className="text-red-600 text-xs mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">No services yet</td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-sm truncate">{c.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {c.active ? 'Active' : 'Held'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(c)}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleHold(c)}
                        title={c.active ? 'Hold' : 'Unhold'}
                        className="p-1.5 rounded hover:bg-amber-50 text-amber-600 transition-colors"
                      >
                        {c.active ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        title="Remove"
                        className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <FormModal category={null} onClose={() => setShowAdd(false)} onSaved={load} />
      )}
      {editing && (
        <FormModal category={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
}
