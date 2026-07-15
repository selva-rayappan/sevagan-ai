'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  status: InvoiceStatus;
  pdfUrl: string | null;
  createdAt: string;
  job: {
    id: string;
    jobNumber: string;
    location: string;
    paymentMode: string | null;
    customer: { id: string; name: string | null; phone: string };
    serviceCategory: { name: string };
  };
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-50 text-blue-700',
  PAID: 'bg-emerald-50 text-emerald-700',
};

const PAGE_SIZE = 20;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = (p = page, s = status) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (s) params.set('status', s);
    apiClient
      .get(`/api/v1/admin/invoices?${params}`)
      .then((r) => {
        setInvoices(r.data.invoices ?? []);
        setTotal(r.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  function handleStatusChange(s: string) {
    setStatus(s);
    setPage(1);
  }

  async function confirmPayment(invoiceId: string) {
    setConfirming(invoiceId);
    try {
      await apiClient.post(`/api/v1/admin/invoices/${invoiceId}/confirm-payment`);
      load(page, status);
    } finally {
      setConfirming(null);
    }
  }

  async function downloadPdf(invoiceId: string, invoiceNumber: string) {
    // window.open() can't attach our Authorization header, so a plain link
    // always 401s — fetch as a blob through the authenticated client instead.
    const res = await apiClient.get(`/api/v1/admin/invoices/${invoiceId}/pdf`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoiceNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} invoice{total !== 1 ? 's' : ''}</p>
        </div>

        {/* Status filter */}
        <select
          id="invoice-status-filter"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Job #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Service</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-14 text-center">
                  <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-gray-400 text-sm">No invoices found</p>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  {/* Invoice # */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {inv.invoiceNumber}
                    </span>
                  </td>

                  {/* Job # */}
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {inv.job?.jobNumber ?? '—'}
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{inv.job?.customer?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{inv.job?.customer?.phone}</p>
                  </td>

                  {/* Service */}
                  <td className="px-4 py-3 text-gray-600 text-xs">{inv.job?.serviceCategory?.name ?? '—'}</td>

                  {/* Amount */}
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {formatCurrency(Number(inv.amount))}
                  </td>

                  {/* Payment mode */}
                  <td className="px-4 py-3">
                    {inv.job?.paymentMode ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          inv.job.paymentMode === 'UPI'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {inv.job.paymentMode}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_STYLES[inv.status as InvoiceStatus] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(inv.createdAt)}</td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* Download PDF */}
                      {inv.pdfUrl && (
                        <button
                          id={`download-pdf-${inv.id}`}
                          onClick={() => downloadPdf(inv.id, inv.invoiceNumber)}
                          title="Download PDF"
                          className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      )}

                      {/* Confirm UPI payment */}
                      {inv.status === 'SENT' && inv.job?.paymentMode === 'UPI' && (
                        <button
                          id={`confirm-payment-${inv.id}`}
                          onClick={() => confirmPayment(inv.id)}
                          disabled={confirming === inv.id}
                          title="Confirm UPI Payment"
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle size={12} />
                          {confirming === inv.id ? '…' : 'Confirm'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} — {total} total
          </p>
          <div className="flex gap-2">
            <button
              id="invoices-prev-page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              id="invoices-next-page"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
