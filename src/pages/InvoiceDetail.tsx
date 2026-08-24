import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Invoice } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  Download,
  Share2,
  DollarSign,
  Building,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { useStudio } from '../context/StudioContext';

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeStudio } = useStudio();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [sharingPdf, setSharingPdf] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.invoices.getById(id);
      setInvoice(data);
      if (data) {
        setPaymentAmount(data.remainingBalance?.toString() || data.total.toString());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      setDownloadingPdf(true);
      setError(null);
      const blob = await api.invoices.getPdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice?.invoiceNumber || 'Invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download backend PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!id || !invoice) return;
    try {
      setSharingPdf(true);
      setError(null);
      const blob = await api.invoices.getPdf(id);
      const file = new File([blob], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });

      const currentStudioName = invoice.studio?.name || activeStudio?.name || 'Ergon Studio';
      // Capacitor Native Share fallback to Web Share
      try {
        await Share.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice from ${currentStudioName} for ${formatCurrency(invoice.total)}`,
          dialogTitle: 'Share Studio Invoice',
        });
      } catch {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice ${invoice.invoiceNumber}`,
            text: `Invoice from ${currentStudioName} for ${formatCurrency(invoice.total)}`,
            files: [file],
          });
        } else {
          handleDownloadPdf();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to share invoice');
    } finally {
      setSharingPdf(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid positive payment amount');
      return;
    }

    try {
      setPaymentLoading(true);
      setError(null);
      const updated = await api.invoices.markPaid(id, { amount: amountNum });
      setInvoice(updated);
      setIsPaymentModalOpen(false);
      setSuccessMessage(
        updated.status === 'PAID'
          ? 'Invoice marked as fully PAID!'
          : `Partial payment of ${formatCurrency(amountNum)} recorded successfully!`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <Card className="text-center py-16">
        <h2 className="text-xl font-bold text-text-primary">Invoice not found</h2>
        <Link
          to="/invoices"
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-accent-blue hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
      </Card>
    );
  }

  const remainingBalance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
  const isPaid = invoice.status === 'PAID';

  const studioName = invoice.studio?.name || activeStudio?.name || 'Studio Workspace';
  const studioTagline = invoice.studio?.tagline || activeStudio?.tagline || '';
  const rawEmail = invoice.studio?.email || activeStudio?.email || '';
  const studioEmail = rawEmail && !rawEmail.includes('@ergon.') ? rawEmail : '';
  const rawWebsite = invoice.studio?.website || activeStudio?.website || '';
  const studioWebsite = rawWebsite && !rawWebsite.includes('ergon.') ? rawWebsite : '';
  const studioInitial = (studioName.trim()[0] || 'S').toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/invoices"
        className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Invoices</span>
      </Link>

      {/* Page Header */}
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Issued ${formatDate(invoice.issueDate)} • Due ${formatDate(invoice.dueDate)}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSharePdf}
              disabled={sharingPdf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-card hover:bg-card-alt text-text-primary text-xs font-bold shadow-sm border border-border-subtle transition-all cursor-pointer"
              title="Share invoice with client"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-card hover:bg-card-alt text-text-primary text-xs font-bold shadow-sm border border-border-subtle transition-all cursor-pointer"
              title="Download official backend PDF"
            >
              {downloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF</span>
            </button>

            {!isPaid && (
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          {invoice.status === 'PAID' && (
            <span className="text-xs font-bold text-accent-green flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Paid in full
            </span>
          )}
          {invoice.status === 'PARTIAL' && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Remaining: {formatCurrency(remainingBalance)}
            </span>
          )}
        </div>
      </PageHeader>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Invoice Document Paper */}
      <Card padding="large" className="border border-border-subtle/80 space-y-8">
        {/* Studio Branding & Metadata Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-sm shadow-xs">
                {studioInitial}
              </div>
              <span className="text-xl font-black tracking-tight text-text-primary">
                {studioName}
              </span>
            </div>
            {studioTagline && (
              <p className="text-xs text-text-secondary">
                {studioTagline}
              </p>
            )}
            {studioEmail && (
              <p className="text-xs text-text-secondary mt-0.5">
                {studioEmail}
              </p>
            )}
            {studioWebsite && (
              <p className="text-xs text-accent-blue mt-0.5 font-medium">
                {studioWebsite}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-2xl font-black tracking-tight text-text-primary block">
              {invoice.invoiceNumber}
            </span>
            <div className="text-xs text-text-secondary space-y-0.5">
              <p>Issue Date: <strong className="text-text-primary">{formatDate(invoice.issueDate)}</strong></p>
              <p>Due Date: <strong className={invoice.status === 'OVERDUE' ? 'text-accent-red font-bold' : 'text-text-primary'}>{formatDate(invoice.dueDate)}</strong></p>
              {invoice.quoteId && (
                <p className="text-[11px] text-accent-blue font-semibold">
                  Converted from Proposal {invoice.quote?.quoteNumber || ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Client & Project Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-border-subtle">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block mb-1">
              Billed To
            </span>
            <h4 className="text-sm font-bold text-text-primary">{invoice.client?.name || 'Studio Client'}</h4>
            {invoice.client?.company && (
              <p className="text-xs font-medium text-text-secondary flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5 text-text-secondary" />
                {invoice.client.company}
              </p>
            )}
            {invoice.client?.email && (
              <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-text-secondary" />
                {invoice.client.email}
              </p>
            )}
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block mb-1">
              Project Context
            </span>
            <h4 className="text-sm font-bold text-text-primary">
              {invoice.project?.title || 'Studio Project'}
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              Quoted Budget: {formatCurrency(invoice.project?.quotedAmount || 0)}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border-subtle text-text-secondary uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60">
              {invoice.lineItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3.5 px-2 font-medium text-text-primary">
                    {item.description}
                  </td>
                  <td className="py-3.5 px-4 text-center text-text-secondary font-semibold">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-text-primary">
                    {formatCurrency(item.unitRate)}
                  </td>
                  <td className="py-3.5 px-2 text-right font-bold text-text-primary">
                    {formatCurrency((item.quantity || 1) * (item.unitRate || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Payment Breakdown */}
        <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row justify-between items-start gap-6">
          <div className="w-full sm:w-1/2 space-y-3">
            {invoice.notes && (
              <div className="bg-card-alt p-3.5 rounded-xl border border-border-subtle/60">
                <span className="text-[10px] uppercase font-bold text-text-secondary block mb-1">
                  Payment Instructions & Notes
                </span>
                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-line">
                  {invoice.notes}
                </p>
              </div>
            )}

            {invoice.paidAt && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-3 py-2 rounded-xl">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Payment recorded on {formatDate(invoice.paidAt)}</span>
              </div>
            )}
          </div>

          <div className="w-full sm:w-80 space-y-2 bg-card-alt p-5 rounded-2xl border border-border-subtle">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Subtotal</span>
              <span className="font-bold text-text-primary">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Tax ({(invoice.taxRate * 100).toFixed(0)}%)</span>
              <span className="font-bold text-text-primary">{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="pt-2 border-t border-border-subtle flex justify-between items-baseline">
              <span className="text-xs font-extrabold uppercase tracking-wider text-text-primary">
                Total Invoiced
              </span>
              <span className="text-2xl font-black text-text-primary">
                {formatCurrency(invoice.total)}
              </span>
            </div>

            {invoice.amountPaid > 0 && (
              <div className="pt-2 border-t border-border-subtle space-y-1 text-xs">
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-accent-orange font-extrabold">
                  <span>Balance Due</span>
                  <span>{formatCurrency(remainingBalance)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Footer with attribution */}
        <div className="pt-6 border-t border-border-subtle/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-text-secondary">
          <div className="flex items-center gap-1.5 font-medium">
            <span>made by</span>
            <a
              href="https://ergon.shishirexe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-primary hover:text-accent-blue transition-colors font-semibold underline decoration-border-subtle hover:decoration-accent-blue underline-offset-2"
            >
              ergon.shishirexe.com
            </a>
          </div>
          <span className="text-[10px] font-mono text-text-secondary/70">
            {invoice.invoiceNumber}
          </span>
        </div>
      </Card>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-8 max-w-md w-full border border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Record Payment</h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:bg-card-alt cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-4">
              Record a payment received for invoice <strong>{invoice.invoiceNumber}</strong>.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={invoice.total}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-sm font-extrabold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
                <div className="flex justify-between text-[11px] text-text-secondary mt-1 font-medium">
                  <span>Remaining Due: {formatCurrency(remainingBalance)}</span>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(remainingBalance.toString())}
                    className="text-accent-blue font-bold hover:underline cursor-pointer"
                  >
                    Pay Full Balance
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:bg-card-alt cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-6 py-2.5 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {paymentLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
