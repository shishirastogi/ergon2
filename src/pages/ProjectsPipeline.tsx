import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Project, Client, ProjectStage } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Plus,
  Kanban,
  List,
  Search,
  Building,
  FileText,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Receipt,
  Calendar,
} from 'lucide-react';

const STAGES: { id: ProjectStage; label: string; accentClass: string; dotClass: string }[] = [
  { id: 'LEAD', label: 'Lead', accentClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', dotClass: 'bg-amber-500' },
  { id: 'QUOTE_SENT', label: 'Quote Sent', accentClass: 'bg-blue-500/15 text-accent-blue', dotClass: 'bg-accent-blue' },
  { id: 'IN_PROGRESS', label: 'In Progress', accentClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400', dotClass: 'bg-indigo-500' },
  { id: 'REVISIONS', label: 'Revisions', accentClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400', dotClass: 'bg-purple-500' },
  { id: 'DELIVERED', label: 'Delivered', accentClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', dotClass: 'bg-emerald-500' },
  { id: 'PAID', label: 'Paid', accentClass: 'bg-green-500/20 text-green-700 dark:text-green-400', dotClass: 'bg-green-600' },
];

export const ProjectsPipeline: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Inline Client Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [quickClientName, setQuickClientName] = useState<string>('');
  const [quickClientCompany, setQuickClientCompany] = useState<string>('');
  const [quickClientEmail, setQuickClientEmail] = useState<string>('');

  // New Project Form State
  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    quotedAmount: '',
    stage: 'LEAD' as ProjectStage,
    startDate: new Date().toISOString().slice(0, 10),
    deadline: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projData, clientData] = await Promise.all([
        api.projects.getAll(),
        api.clients.getAll(),
      ]);
      setProjects(projData || []);
      setClients(clientData || []);
      if (clientData && clientData.length > 0 && !formData.clientId) {
        setFormData((prev) => ({ ...prev, clientId: clientData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load project pipeline data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStageChange = async (projectId: string, newStage: ProjectStage) => {
    try {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, stage: newStage } : p))
      );
      await api.projects.update(projectId, { stage: newStage });
    } catch (err) {
      console.error('Failed to update stage', err);
      fetchData();
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.clientId) return;

    try {
      setSaving(true);
      const newProj = await api.projects.create({
        title: formData.title,
        clientId: formData.clientId,
        quotedAmount: Number(formData.quotedAmount) || 0,
        stage: formData.stage,
        startDate: formData.startDate,
        deadline: formData.deadline,
        notes: formData.notes,
      });

      const client = clients.find((c) => c.id === formData.clientId);
      setProjects([{ ...newProj, client }, ...projects]);
      setIsModalOpen(false);
      setFormData({
        title: '',
        clientId: clients[0]?.id || '',
        quotedAmount: '',
        stage: 'LEAD',
        startDate: new Date().toISOString().slice(0, 10),
        deadline: '',
        notes: '',
      });
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setSaving(false);
    }
  };

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
      const updatedClients = [created, ...clients];
      setClients(updatedClients);
      setFormData((prev) => ({ ...prev, clientId: created.id }));
      setIsClientModalOpen(false);
      setQuickClientName('');
      setQuickClientCompany('');
      setQuickClientEmail('');
    } catch (err) {
      console.error('Failed to create client', err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const titleMatch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const clientMatch =
      p.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client?.company?.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || clientMatch;
  });

  const totalPipelineBudget = projects.reduce((acc, p) => acc + (p.quotedAmount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Pipeline"
        subtitle={`Total Pipeline Value: ${formatCurrency(totalPipelineBudget)} across ${projects.length} studio projects`}
        action={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-card/80 p-1 rounded-full shadow-sm border border-border-subtle">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Kanban Board View"
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 px-5 py-2.5 rounded-pill font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        }
      />

      {/* Search Input Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects or clients..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-card-alt border border-border-subtle text-xs font-medium text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
        </div>
      ) : viewMode === 'kanban' ? (
        /* Robust Flex Kanban Board View: Zero squishing, zero overlap */
        <div className="flex gap-4 overflow-x-auto pb-6 items-start snap-x">
          {STAGES.map((stage, stageIdx) => {
            const stageProjects = filteredProjects.filter((p) => p.stage === stage.id);
            const stageTotal = stageProjects.reduce((acc, p) => acc + (p.quotedAmount || 0), 0);

            return (
              <div
                key={stage.id}
                className="w-[280px] sm:w-[300px] shrink-0 min-w-[280px] bg-card-alt/70 rounded-card p-3.5 border border-border-subtle/80 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dotClass}`} />
                    <span className="text-xs font-bold text-text-primary">{stage.label}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-card text-text-secondary border border-border-subtle shadow-xs">
                      {stageProjects.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold text-text-secondary">
                    {formatCurrency(stageTotal)}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1">
                  {stageProjects.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-border-subtle/80 rounded-2xl flex items-center justify-center text-center p-3">
                      <span className="text-[11px] font-medium text-text-secondary">
                        No projects in {stage.label.toLowerCase()}
                      </span>
                    </div>
                  ) : (
                    stageProjects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-card rounded-2xl p-4 shadow-ergon-card hover:shadow-ergon-card-hover border border-border-subtle/80 transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-xs font-bold text-text-primary leading-snug group-hover:text-accent-blue transition-colors break-words">
                              {project.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary mb-3">
                            <Building className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                            <span className="truncate">
                              {project.client?.company || project.client?.name || 'Unknown Client'}
                            </span>
                          </div>

                          {project.notes && (
                            <p className="text-[10px] text-text-secondary line-clamp-2 mb-3 bg-card-alt p-2.5 rounded-xl border border-border-subtle/50">
                              {project.notes}
                            </p>
                          )}
                        </div>

                        <div>
                          {/* Budget & Due Date Row */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle/60 text-xs">
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-text-secondary block">
                                Budget
                              </span>
                              <span className="text-xs font-black text-text-primary">
                                {formatCurrency(project.quotedAmount)}
                              </span>
                            </div>

                            {project.deadline && (
                              <div className="text-right">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-text-secondary block flex items-center gap-0.5 justify-end">
                                  <Calendar className="w-2.5 h-2.5" /> Due
                                </span>
                                <span className="text-[10px] font-semibold text-text-primary">
                                  {formatDate(project.deadline)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick Controls Row (Zero overlapping) */}
                          <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-border-subtle/60">
                            {/* Prev Stage Button */}
                            <div className="w-6 flex items-center justify-start">
                              {stageIdx > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleStageChange(project.id, STAGES[stageIdx - 1].id)}
                                  className="p-1 text-text-secondary hover:text-text-primary hover:bg-card-alt rounded-lg transition-colors cursor-pointer"
                                  title={`Move back to ${STAGES[stageIdx - 1].label}`}
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>

                            {/* Action Links */}
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/quotes/new?projectId=${project.id}`}
                                className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-accent-blue text-[10px] font-bold transition-colors flex items-center gap-1"
                                title="Create Quote for this project"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Quote</span>
                              </Link>
                              <Link
                                to={`/invoices/new?projectId=${project.id}&clientId=${project.clientId}`}
                                className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold transition-colors flex items-center gap-1"
                                title="Create Invoice for this project"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Invoice</span>
                              </Link>
                            </div>

                            {/* Next Stage Button */}
                            <div className="w-6 flex items-center justify-end">
                              {stageIdx < STAGES.length - 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleStageChange(project.id, STAGES[stageIdx + 1].id)}
                                  className="p-1 text-text-secondary hover:text-text-primary hover:bg-card-alt rounded-lg transition-colors cursor-pointer"
                                  title={`Advance to ${STAGES[stageIdx + 1].label}`}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <Card padding="none" className="overflow-hidden border border-border-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card-alt border-b border-border-subtle text-text-secondary uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Project Title</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">Quoted Budget</th>
                  <th className="py-3.5 px-4">Deadline</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-card-alt/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-text-primary">{project.title}</td>
                    <td className="py-4 px-4 font-medium text-text-secondary">
                      {project.client?.company || project.client?.name || '—'}
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={project.stage}
                        onChange={(e) =>
                          handleStageChange(project.id, e.target.value as ProjectStage)
                        }
                        className="text-xs font-semibold px-3 py-1 rounded-full bg-card-alt border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-4 font-extrabold text-text-primary">
                      {formatCurrency(project.quotedAmount)}
                    </td>
                    <td className="py-4 px-4 text-text-secondary font-medium">
                      {formatDate(project.deadline)}
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                      <Link
                        to={`/quotes/new?projectId=${project.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-accent-blue hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full"
                      >
                        <FileText className="w-3 h-3" />
                        Quote
                      </Link>
                      <Link
                        to={`/invoices/new?projectId=${project.id}&clientId=${project.clientId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full"
                      >
                        <Receipt className="w-3 h-3" />
                        Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border-subtle">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text-primary">New Studio Project</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-card-alt"
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
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Design System & Web App UI"
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

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
                    className="w-full px-3.5 py-2.5 rounded-input bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add Your First Client</span>
                  </button>
                ) : (
                  <select
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Quoted Budget ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.quotedAmount}
                    onChange={(e) => setFormData({ ...formData, quotedAmount: e.target.value })}
                    placeholder="8500.00"
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
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({ ...formData, stage: e.target.value as ProjectStage })
                    }
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Project Deliverables & Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Phase breakdown, deliverables, client requirements..."
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-alt"
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
    </div>
  );
};
