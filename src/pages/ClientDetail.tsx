import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Client, Project, ClientStatus, ProjectStage, CurrencyCode } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { SUPPORTED_CURRENCIES } from '../context/CurrencyContext';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Calendar,
  FolderKanban,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  X,
  Clock,
} from 'lucide-react';

export const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    currency: 'USD' as CurrencyCode,
    status: 'ACTIVE' as ClientStatus,
    notes: '',
  });

  // New Project Form State
  const [projectFormData, setProjectFormData] = useState({
    title: '',
    quotedAmount: '',
    stage: 'LEAD' as ProjectStage,
    deadline: '',
    notes: '',
  });

  const fetchClientData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.clients.getById(id);
      if (data) {
        setClient(data);
        setFormData({
          name: data.name || '',
          company: data.company || '',
          email: data.email || '',
          phone: data.phone || '',
          currency: (data.currency as CurrencyCode) || 'USD',
          status: data.status || 'ACTIVE',
          notes: data.notes || '',
        });
      }
    } catch (err) {
      console.error('Failed to load client', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSaving(true);
      const updated = await api.clients.update(id, formData);
      setClient({ ...client, ...updated });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update client', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await api.clients.delete(id);
      navigate('/clients');
    } catch (err) {
      console.error('Failed to delete client', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !projectFormData.title) return;
    try {
      setSaving(true);
      await api.projects.create({
        title: projectFormData.title,
        clientId: id,
        quotedAmount: Number(projectFormData.quotedAmount) || 0,
        stage: projectFormData.stage,
        deadline: projectFormData.deadline,
        notes: projectFormData.notes,
      });
      setIsNewProjectModalOpen(false);
      setProjectFormData({
        title: '',
        quotedAmount: '',
        stage: 'LEAD',
        deadline: '',
        notes: '',
      });
      fetchClientData();
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card className="text-center py-16">
        <h2 className="text-xl font-bold">Client not found</h2>
        <Link
          to="/clients"
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-accent-blue hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/clients"
        className="inline-flex items-center gap-2 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Clients</span>
      </Link>

      {/* Top Header */}
      <PageHeader
        title={client.name}
        subtitle={client.company ? `${client.company} • Added ${formatDate(client.createdAt)}` : `Added ${formatDate(client.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-card hover:bg-card-alt text-text-primary text-xs font-bold shadow-sm border border-border-subtle transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        }
      >
        <StatusBadge status={client.status} size="lg" />
      </PageHeader>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card padding="standard" className="flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Total Billed
          </span>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              {formatCurrency(client.totalBilled || 0)}
            </span>
            <p className="text-[11px] text-text-secondary mt-1 font-medium">Cumulative lifetime revenue</p>
          </div>
        </Card>

        <Card padding="standard" className="flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Outstanding Balance
          </span>
          <div className="mt-3">
            <span
              className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                (client.outstandingBalance || 0) > 0 ? 'text-accent-orange' : 'text-text-primary'
              }`}
            >
              {formatCurrency(client.outstandingBalance || 0)}
            </span>
            <p className="text-[11px] text-text-secondary mt-1 font-medium">Unpaid invoices pending</p>
          </div>
        </Card>

        <Card padding="standard" className="flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Active Projects
          </span>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              {client.projects?.length || 0}
            </span>
            <p className="text-[11px] text-text-secondary mt-1 font-medium">Projects in pipeline</p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Details + Linked Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Client Contact Info & Notes */}
        <div className="space-y-6 lg:col-span-1">
          <Card title="Client Details" showMoreButton>
            <div className="space-y-4 text-xs font-medium">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">Email</span>
                  <a href={`mailto:${client.email}`} className="text-accent-blue font-semibold hover:underline">
                    {client.email}
                  </a>
                </div>
              </div>

              {client.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-secondary block">Phone</span>
                    <span className="text-text-primary font-semibold">{client.phone}</span>
                  </div>
                </div>
              )}

              {client.company && (
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-secondary block">Company</span>
                    <span className="text-text-primary font-semibold">{client.company}</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">Client Since</span>
                  <span className="text-text-primary font-semibold">{formatDate(client.createdAt)}</span>
                </div>
              </div>

              {client.notes && (
                <div className="pt-3 border-t border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-text-secondary block mb-1">
                    Studio Notes
                  </span>
                  <p className="text-text-primary leading-relaxed whitespace-pre-line bg-card-alt p-3 rounded-xl border border-border-subtle/60">
                    {client.notes}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-border-subtle flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-accent-red font-semibold hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Client
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Linked Projects */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Linked Projects"
            subtitle="Projects associated with this client"
            action={
              <button
                onClick={() => setIsNewProjectModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-accent-blue hover:text-blue-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project
              </button>
            }
          >
            {(!client.projects || client.projects.length === 0) ? (
              <div className="text-center py-10">
                <FolderKanban className="w-8 h-8 text-text-secondary opacity-40 mx-auto mb-2" />
                <p className="text-xs font-bold text-text-primary">No projects yet for this client</p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Create a new project or quote to start tracking work.
                </p>
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 px-3.5 py-1.5 rounded-full cursor-pointer shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Project
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {client.projects.map((project: Project) => (
                  <div
                    key={project.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-card-alt p-2 rounded-xl transition-colors"
                  >
                    <div className="space-y-1">
                      <Link
                        to={`/projects`}
                        className="text-sm font-bold text-text-primary hover:text-accent-blue transition-colors"
                      >
                        {project.title}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        {project.deadline && (
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-text-secondary" />
                            Due {formatDate(project.deadline)}
                          </span>
                        )}
                        {project.notes && (
                          <span className="text-[11px] text-text-secondary truncate max-w-xs">
                            {project.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-text-secondary block">
                          Budget
                        </span>
                        <span className="text-xs font-extrabold text-text-primary">
                          {formatCurrency(project.quotedAmount)}
                        </span>
                      </div>
                      <StatusBadge status={project.stage} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Client Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border-subtle">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text-primary">Edit Client</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-card-alt cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Client Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as CurrencyCode })}
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} – {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-text-secondary mt-0.5">Invoices for this client will use this currency by default.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Client Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="LEAD">Lead</option>
                  <option value="PAST">Past</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Studio Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-alt cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-7 max-w-md w-full border border-border-subtle">
            <h3 className="text-lg font-bold text-text-primary">Delete Client?</h3>
            <p className="text-xs text-text-secondary mt-2">
              Are you sure you want to delete <strong className="text-text-primary">{client.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:bg-card-alt cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={saving}
                className="px-5 py-2 rounded-full bg-accent-red text-white text-xs font-bold shadow-sm hover:bg-red-600 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border-subtle">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text-primary">New Project for {client.name}</h2>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-card-alt cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={projectFormData.title}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, title: e.target.value })
                  }
                  placeholder="e.g. Brand Identity & Strategy"
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Quoted Budget ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={projectFormData.quotedAmount}
                    onChange={(e) =>
                      setProjectFormData({ ...projectFormData, quotedAmount: e.target.value })
                    }
                    placeholder="5000.00"
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                  <span className="text-[10px] text-text-secondary mt-0.5 block">
                    Maps to quotedAmount
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Initial Stage
                  </label>
                  <select
                    value={projectFormData.stage}
                    onChange={(e) =>
                      setProjectFormData({
                        ...projectFormData,
                        stage: e.target.value as ProjectStage,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="QUOTE_SENT">Quote Sent</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVISIONS">Revisions</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={projectFormData.deadline}
                  onChange={(e) =>
                    setProjectFormData({ ...projectFormData, deadline: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Deliverables & Scope Notes
                </label>
                <textarea
                  rows={3}
                  value={projectFormData.notes}
                  onChange={(e) => setProjectFormData({ ...projectFormData, notes: e.target.value })}
                  placeholder="Key milestones, scope deliverables, and timelines..."
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-alt cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
