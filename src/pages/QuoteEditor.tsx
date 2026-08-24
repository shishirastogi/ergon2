import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Project, Client, QuoteItem, QuoteStatus } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency } from '../utils/formatters';
import { useStudio } from '../context/StudioContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Receipt,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  FolderPlus,
} from 'lucide-react';

export const QuoteEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeStudio } = useStudio();

  const isNew = !id;
  const queryProjectId = searchParams.get('projectId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [converting, setConverting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [quoteNumber, setQuoteNumber] = useState<string>('QUO-2026-001');
  const [projectId, setProjectId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [status, setStatus] = useState<QuoteStatus>('DRAFT');
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [taxRate, setTaxRate] = useState<number>(0.08);
  const [notes, setNotes] = useState<string>(
    'Valid for 14 calendar days from issuance. Standard studio terms and conditions apply.'
  );

  const [lineItems, setLineItems] = useState<QuoteItem[]>([
    { description: 'UX Discovery & Strategy Sprint', quantity: 1, unitRate: 2500 },
    { description: 'Design System & UI Components', quantity: 1, unitRate: 4000 },
  ]);

  // Converted badge helper
  const [isConverted, setIsConverted] = useState<boolean>(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  // Inline Quick Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [quickClientName, setQuickClientName] = useState<string>('');
  const [quickClientCompany, setQuickClientCompany] = useState<string>('');
  const [quickClientEmail, setQuickClientEmail] = useState<string>('');
  const [quickProjectTitle, setQuickProjectTitle] = useState<string>('');
  const [quickProjectBudget, setQuickProjectBudget] = useState<string>('6500');

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, clientData, quoteList] = await Promise.all([
        api.projects.getAll(),
        api.clients.getAll(),
        api.quotes.getAll(),
      ]);

      setProjects(projData || []);
      setClients(clientData || []);

      if (isNew) {
        const nextNum = `QUO-2026-${String((quoteList?.length || 0) + 1).padStart(3, '0')}`;
        setQuoteNumber(nextNum);

        if (queryProjectId) {
          setProjectId(queryProjectId);
          const p = projData.find((x) => x.id === queryProjectId);
          if (p) setClientId(p.clientId);
        } else if (projData && projData.length > 0) {
          setProjectId(projData[0].id);
          setClientId(projData[0].clientId);
        }
      } else {
        const quote = await api.quotes.getById(id!);
        if (quote) {
          setQuoteNumber(quote.quoteNumber);
          if (quote.projectId) setProjectId(quote.projectId);
          if (quote.clientId) setClientId(quote.clientId);
          setStatus(quote.status);
          setTaxRate(quote.taxRate);
          setLineItems(quote.lineItems || []);
          if (quote.validUntil) setValidUntil(quote.validUntil.slice(0, 10));
          if (quote.notes) setNotes(quote.notes);

          // Check if converted
          const invoices = await api.invoices.getAll();
          const linkedInv = invoices.find((inv) => inv.quoteId === quote.id);
          if (linkedInv) {
            setIsConverted(true);
            setInvoiceId(linkedInv.id);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quote details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, queryProjectId]);

  const handleProjectSelect = (pId: string) => {
    setProjectId(pId);
    const p = projects.find((x) => x.id === pId);
    if (p) setClientId(p.clientId);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitRate: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Live client-side calculation
  const previewSubtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitRate) || 0),
    0
  );
  const previewTaxAmount = Number((previewSubtotal * taxRate).toFixed(2));
  const previewTotal = Number((previewSubtotal + previewTaxAmount).toFixed(2));

  // Quick Client Creation
  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName || !quickClientEmail) return;
    try {
      const created = await api.clients.create({
        name: quickClientName,
        company: quickClientCompany,
        email: quickClientEmail,
        status: 'ACTIVE',
      });
      const updatedList = [created, ...clients];
      setClients(updatedList);
      setClientId(created.id);
      setIsClientModalOpen(false);
      setQuickClientName('');
      setQuickClientCompany('');
      setQuickClientEmail('');
      setIsProjectModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    }
  };

  // Quick Project Creation
  const handleQuickCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProjectTitle || !clientId) {
      setError('Please select or create a client first');
      return;
    }
    try {
      const created = await api.projects.create({
        title: quickProjectTitle,
        clientId,
        quotedAmount: Number(quickProjectBudget) || previewTotal || 0,
        stage: 'QUOTE_SENT',
      });
      const updatedList = [created, ...projects];
      setProjects(updatedList);
      setProjectId(created.id);
      setIsProjectModalOpen(false);
      setQuickProjectTitle('');
      setQuickProjectBudget('6500');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !clientId) {
      setError('Please select or create a project and client for this quote');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const quoteData = {
        quoteNumber,
        projectId,
        clientId,
        studioId: activeStudio?.id,
        studio: activeStudio || undefined,
        status,
        validUntil,
        lineItems,
        taxRate,
        notes,
      };

      if (isNew) {
        await api.quotes.create(quoteData);
        navigate(`/quotes`);
      } else {
        await api.quotes.update(id!, quoteData);
        navigate(`/quotes`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!id) return;
    try {
      setConverting(true);
      setError(null);
      const invoice = await api.quotes.convertToInvoice(id);
      navigate(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to convert quote to invoice');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Link */}
      <Link
        to="/quotes"
        className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Quotes</span>
      </Link>

      <PageHeader
        title={isNew ? 'Create New Quote' : `Quote ${quoteNumber}`}
        subtitle={
          isNew
            ? 'Build line-item proposal with live financial calculation'
            : `Created for ${projects.find((p) => p.id === projectId)?.title || 'Studio Project'}`
        }
        action={
          <div className="flex items-center gap-2">
            {!isNew && !isConverted && (
              <button
                type="button"
                onClick={handleConvertToInvoice}
                disabled={converting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-text-inverse px-4 py-2 rounded-pill font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {converting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Receipt className="w-3.5 h-3.5" />
                )}
                <span>Convert to Invoice</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveQuote}
              disabled={saving}
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 px-5 py-2 rounded-pill font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isNew ? 'Save Quote' : 'Update Quote'}</span>
            </button>
          </div>
        }
      >
        <StatusBadge status={status} size="lg" />
        {isConverted && (
          <Link
            to={`/invoices/${invoiceId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-3.5 py-1 rounded-full transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Linked to Invoice</span>
          </Link>
        )}
      </PageHeader>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveQuote} className="space-y-6">
        {/* Project & Client Selector Card */}
        <Card title="Proposal Details">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Project *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (clients.length === 0) {
                      setIsClientModalOpen(true);
                    } else {
                      setIsProjectModalOpen(true);
                    }
                  }}
                  className="text-[10px] font-bold text-accent-blue hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> New Project
                </button>
              </div>
              {projects.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (clients.length === 0) {
                      setIsClientModalOpen(true);
                    } else {
                      setIsProjectModalOpen(true);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-input bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Create First Project</span>
                </button>
              ) : (
                <select
                  required
                  value={projectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Client (Auto-linked)
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary truncate">
                {clients.find((c) => c.id === clientId)?.name || 'Select or create a project'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Quote Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                className="w-full px-3.5 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Line Items Builder Card */}
        <Card
          title="Line Items"
          subtitle="Define deliverable scope, rates, and quantities"
          action={
            <button
              type="button"
              onClick={handleAddLineItem}
              className="flex items-center gap-1.5 text-xs font-bold text-accent-blue hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          }
        >
          <div className="space-y-3">
            {lineItems.map((item, index) => {
              const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitRate) || 0);
              return (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-2xl bg-card-alt border border-border-subtle/80"
                >
                  <div className="flex-1">
                    <label className="block sm:hidden text-[10px] uppercase font-bold text-text-secondary mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      placeholder="e.g. Design Discovery & Wireframes"
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                    />
                  </div>

                  <div className="w-full sm:w-24">
                    <label className="block sm:hidden text-[10px] uppercase font-bold text-text-secondary mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(index, 'quantity', Math.max(1, Number(e.target.value)))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border-subtle text-xs font-semibold text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <label className="block sm:hidden text-[10px] uppercase font-bold text-text-secondary mb-1">
                      Unit Rate ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={item.unitRate}
                      onChange={(e) =>
                        handleLineItemChange(index, 'unitRate', Math.max(0, Number(e.target.value)))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border-subtle text-xs font-semibold text-text-primary text-right focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                    />
                  </div>

                  <div className="w-full sm:w-28 text-right px-2 py-1 flex items-center justify-between sm:justify-end gap-2">
                    <span className="sm:hidden text-xs text-text-secondary font-medium">Total:</span>
                    <span className="text-xs font-extrabold text-text-primary">
                      {formatCurrency(itemTotal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    disabled={lineItems.length <= 1}
                    className="p-2 rounded-xl text-text-secondary hover:text-accent-red hover:bg-rose-500/10 transition-colors disabled:opacity-30 self-end sm:self-center cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Tax & Live Calculation Breakdown */}
          <div className="mt-6 pt-6 border-t border-border-subtle flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="w-full sm:w-1/2 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Tax Rate (GST / VAT)
                </label>
                <div className="flex items-center gap-2 max-w-xs">
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={0.05}>5%</option>
                    <option value={0.08}>8%</option>
                    <option value={0.1}>10%</option>
                    <option value={0.13}>13%</option>
                    <option value={0.15}>15%</option>
                    <option value={0.18}>18%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Validity Deadline
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full max-w-xs px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Scope Notes & Terms
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment milestones, revisions allowance, copyright assignment..."
                  className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>
            </div>

            {/* Calculated Totals Box */}
            <div className="w-full sm:w-80 bg-card-alt p-5 rounded-2xl border border-border-subtle space-y-3">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Subtotal</span>
                <span className="font-bold text-text-primary">{formatCurrency(previewSubtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span className="font-bold text-text-primary">{formatCurrency(previewTaxAmount)}</span>
              </div>
              <div className="pt-3 border-t border-border-subtle flex justify-between items-baseline">
                <span className="text-xs font-extrabold uppercase tracking-wider text-text-primary">
                  Calculated Total
                </span>
                <span className="text-2xl font-black text-text-primary">
                  {formatCurrency(previewTotal)}
                </span>
              </div>
              <p className="text-[10px] text-text-secondary text-right italic mt-1">
                Live preview — authoritative totals computed by server on save
              </p>
            </div>
          </div>
        </Card>
      </form>

      {/* Inline Quick Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-7 max-w-md w-full border border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Add New Client</h3>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:bg-card-alt cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateClient} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  placeholder="e.g. Jessica Miller"
                  className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={quickClientCompany}
                  onChange={(e) => setQuickClientCompany(e.target.value)}
                  placeholder="e.g. Horizon Labs"
                  className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={quickClientEmail}
                  onChange={(e) => setQuickClientEmail(e.target.value)}
                  placeholder="jessica@horizonlabs.io"
                  className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:bg-card-alt cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Add & Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Quick Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-7 max-w-md w-full border border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Add New Project</h3>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:bg-card-alt cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateProject} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={quickProjectTitle}
                  onChange={(e) => setQuickProjectTitle(e.target.value)}
                  placeholder="e.g. Brand Identity & Strategy"
                  className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Quoted Budget ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={quickProjectBudget}
                  onChange={(e) => setQuickProjectBudget(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:bg-card-alt cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Add & Select Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
