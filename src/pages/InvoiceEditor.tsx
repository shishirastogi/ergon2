import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Client, Project, InvoiceItem, InvoiceStatus } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { formatCurrency } from '../utils/formatters';
import { useStudio } from '../context/StudioContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  X,
  UserPlus,
  FolderPlus,
} from 'lucide-react';

export const InvoiceEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeStudio } = useStudio();

  const queryClientId = searchParams.get('clientId');
  const queryProjectId = searchParams.get('projectId');

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState<string>('INV-2026-001');
  const [clientId, setClientId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [status, setStatus] = useState<InvoiceStatus>('UNPAID');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [taxRate, setTaxRate] = useState<number>(0.08);
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [notes, setNotes] = useState<string>(
    'Thank you for your business. Payment is due within 30 days via direct bank transfer or online payment.'
  );

  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { description: 'Design & Creative Services', quantity: 1, unitRate: 0 },
  ]);

  // Inline Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [quickClientName, setQuickClientName] = useState<string>('');
  const [quickClientCompany, setQuickClientCompany] = useState<string>('');
  const [quickClientEmail, setQuickClientEmail] = useState<string>('');
  const [quickProjectTitle, setQuickProjectTitle] = useState<string>('');
  const [quickProjectBudget, setQuickProjectBudget] = useState<string>('5000');

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientData, projData, invoiceList] = await Promise.all([
        api.clients.getAll(),
        api.projects.getAll(),
        api.invoices.getAll(),
      ]);

      setClients(clientData || []);
      setProjects(projData || []);

      const nextNum = `INV-2026-${String((invoiceList?.length || 0) + 1).padStart(3, '0')}`;
      setInvoiceNumber(nextNum);

      if (queryClientId) {
        setClientId(queryClientId);
      } else if (clientData && clientData.length > 0) {
        setClientId(clientData[0].id);
      }

      if (queryProjectId) {
        setProjectId(queryProjectId);
        const p = projData.find((x) => x.id === queryProjectId);
        if (p) setClientId(p.clientId);
      } else if (projData && projData.length > 0) {
        setProjectId(projData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load clients and projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [queryClientId, queryProjectId]);

  // Line item handlers
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitRate: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Live calculations
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitRate) || 0),
    0
  );
  const taxAmount = Number((subtotal * taxRate).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));
  const paidVal = Number(amountPaid) || 0;
  const remainingBalance = Math.max(0, total - paidVal);

  // Quick Client Creation Inline
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
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    }
  };

  // Quick Project Creation Inline
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
        quotedAmount: Number(quickProjectBudget) || 0,
        stage: 'IN_PROGRESS',
      });
      const updatedList = [created, ...projects];
      setProjects(updatedList);
      setProjectId(created.id);
      setIsProjectModalOpen(false);
      setQuickProjectTitle('');
      setQuickProjectBudget('5000');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  // Save Custom Invoice
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select or add a client for this invoice');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const invoiceData = {
        invoiceNumber,
        clientId,
        projectId,
        studioId: activeStudio?.id,
        studio: activeStudio || undefined,
        status,
        issueDate,
        dueDate,
        lineItems,
        subtotal,
        taxRate,
        taxAmount,
        total,
        amountPaid: status === 'PAID' ? total : paidVal,
        notes,
      };

      const created = await api.invoices.create(invoiceData);
      navigate(`/invoices/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const clientProjects = projects.filter((p) => !clientId || p.clientId === clientId);

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
        to="/invoices"
        className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Invoices</span>
      </Link>

      <PageHeader
        title="Create Custom Invoice"
        subtitle="Build and issue a custom studio invoice with flexible line items"
        action={
          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={saving}
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 px-6 py-2.5 rounded-pill font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save & Issue Invoice</span>
          </button>
        }
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveInvoice} className="space-y-6">
        {/* Invoice Metadata Card */}
        <Card title="Invoice Header & Client Context">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-mono font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>

            {/* Client Picker with Inline + Add Client */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Client *
                </label>
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="text-[10px] font-bold text-accent-blue hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> New Client
                </button>
              </div>
              {clients.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="w-full px-3.5 py-2.5 rounded-input bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Your First Client</span>
                </button>
              ) : (
                <select
                  required
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    const relProjects = projects.filter((p) => p.clientId === e.target.value);
                    if (relProjects.length > 0) {
                      setProjectId(relProjects[0].id);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Project Picker with Inline + Add Project */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Linked Project
                </label>
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(true)}
                  className="text-[10px] font-bold text-accent-blue hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> New Project
                </button>
              </div>
              {clientProjects.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(true)}
                  className="w-full px-3.5 py-2.5 rounded-input bg-card-alt border border-dashed border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Create Project</span>
                </button>
              ) : (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                >
                  <option value="">No Project (Direct Retainer)</option>
                  {clientProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Payment Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const s = e.target.value as InvoiceStatus;
                  setStatus(s);
                  if (s === 'PAID') {
                    setAmountPaid(total.toString());
                  } else if (s === 'UNPAID') {
                    setAmountPaid('0');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              >
                <option value="UNPAID">Unpaid (Pending)</option>
                <option value="PARTIAL">Partial Payment</option>
                <option value="PAID">Paid in Full</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border-subtle/70">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>

            {status === 'PARTIAL' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-accent-orange mb-1">
                  Amount Collected So Far ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={total}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-input bg-amber-50/50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-extrabold text-accent-orange focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Line Items Builder */}
        <Card
          title="Line Items"
          subtitle="Add billable items, milestones, and deliverables"
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
                      placeholder="e.g. UX Design & Interactive Prototypes"
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

          {/* Tax & Financial Summary */}
          <div className="mt-6 pt-6 border-t border-border-subtle flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="w-full sm:w-1/2 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Tax Rate (GST / VAT)
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full max-w-xs px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                >
                  <option value={0}>0% (Tax Exempt)</option>
                  <option value={0.05}>5%</option>
                  <option value={0.08}>8%</option>
                  <option value={0.10}>10%</option>
                  <option value={0.13}>13%</option>
                  <option value={0.15}>15%</option>
                  <option value={0.18}>18%</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Payment Instructions & Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bank details, wire instructions, payment terms..."
                  className="w-full px-3.5 py-2 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>
            </div>

            {/* Calculated Breakdown Card */}
            <div className="w-full sm:w-80 bg-card-alt p-5 rounded-2xl border border-border-subtle space-y-3">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Subtotal</span>
                <span className="font-bold text-text-primary">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-text-secondary">
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span className="font-bold text-text-primary">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="pt-3 border-t border-border-subtle flex justify-between items-baseline">
                <span className="text-xs font-extrabold uppercase tracking-wider text-text-primary">
                  Total Amount
                </span>
                <span className="text-2xl font-black text-text-primary">
                  {formatCurrency(total)}
                </span>
              </div>

              {status === 'PARTIAL' && (
                <div className="pt-2 border-t border-border-subtle/80 space-y-1 text-xs">
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>Paid</span>
                    <span>{formatCurrency(paidVal)}</span>
                  </div>
                  <div className="flex justify-between text-accent-orange font-extrabold">
                    <span>Remaining Due</span>
                    <span>{formatCurrency(remainingBalance)}</span>
                  </div>
                </div>
              )}
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
                  Add & Select Client
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
                  placeholder="e.g. Website Overhaul & Brand Kit"
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
