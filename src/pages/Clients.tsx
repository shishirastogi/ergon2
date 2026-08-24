import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Client, ClientStatus, CurrencyCode } from '../types';
import { SUPPORTED_CURRENCIES } from '../context/CurrencyContext';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency } from '../utils/formatters';
import {
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  ArrowUpRight,
  FolderKanban,
  Loader2,
  X,
} from 'lucide-react';

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    currency: 'USD' as CurrencyCode,
    status: 'ACTIVE' as ClientStatus,
    notes: '',
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await api.clients.getAll();
      setClients(data || []);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    try {
      setSaving(true);
      const newClient = await api.clients.create(formData);
      setClients([newClient, ...clients]);
      setIsModalOpen(false);
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        currency: 'USD' as CurrencyCode,
        status: 'ACTIVE',
        notes: '',
      });
    } catch (err) {
      console.error('Failed to create client', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesFilter = statusFilter === 'ALL' || client.status === statusFilter;
    const nameMatch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const companyMatch = client.company?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const emailMatch = client.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && (nameMatch || companyMatch || emailMatch);
  });

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'ACTIVE').length;
  const totalBilledAll = clients.reduce((acc, c) => acc + (c.totalBilled || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`Managing ${activeClients} active accounts (${totalClients} total) • Lifetime Billed: ${formatCurrency(totalBilledAll)}`}
        action={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 px-5 py-2.5 rounded-pill font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        }
      />

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'ACTIVE', 'LEAD', 'PAST'] as const).map((filter) => {
            const count =
              filter === 'ALL'
                ? clients.length
                : clients.filter((c) => c.status === filter).length;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 shadow-xs'
                    : 'bg-card/80 hover:bg-card text-text-secondary hover:text-text-primary border border-border-subtle'
                }`}
              >
                {filter === 'ALL' ? 'All Clients' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === filter
                      ? 'bg-white/20 text-white dark:bg-white/10 dark:text-neutral-200'
                      : 'bg-card-alt text-text-secondary'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients or company..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-card-alt border border-border-subtle text-xs font-medium text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-card-alt mx-auto flex items-center justify-center text-text-secondary mb-3">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-primary">No clients found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No clients match "${searchQuery}". Try changing your search query or filters.`
              : 'Add your first client to start creating quotes, invoices, and tracking projects.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-full shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Client
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const projectCount = client.projects?.length || 0;
            return (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="group block focus:outline-none"
              >
                <Card
                  padding="standard"
                  className="h-full flex flex-col justify-between hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-text-primary group-hover:text-accent-blue transition-colors">
                          {client.name}
                        </h3>
                        {client.company && (
                          <p className="text-xs font-medium text-text-secondary flex items-center gap-1 mt-0.5">
                            <Building className="w-3.5 h-3.5 text-text-secondary" />
                            {client.company}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={client.status} size="sm" />
                    </div>

                    <div className="space-y-1.5 my-4 text-xs text-text-secondary">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-subtle/80 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                          Total Billed
                        </span>
                        <span className="text-sm font-extrabold text-text-primary">
                          {formatCurrency(client.totalBilled || 0)}
                        </span>
                      </div>
                      {client.outstandingBalance ? (
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-accent-orange block">
                            Pending
                          </span>
                          <span className="text-sm font-extrabold text-accent-orange">
                            {formatCurrency(client.outstandingBalance)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary group-hover:text-text-primary">
                      <FolderKanban className="w-3.5 h-3.5" />
                      <span>{projectCount} {projectCount === 1 ? 'proj' : 'projs'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border-subtle">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text-primary">Add New Client</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-card-alt cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sarah Chen"
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
                  placeholder="e.g. Apex Digital Labs"
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
                    placeholder="sarah@apexdigital.io"
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
                    placeholder="+1 (415) 555-0192"
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
                  <option value="ACTIVE">Active Client</option>
                  <option value="LEAD">Lead / Prospect</option>
                  <option value="PAST">Past Client</option>
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
                  placeholder="Brand preferences, billing terms, communication style..."
                  className="w-full px-4 py-2.5 rounded-input bg-card-alt border border-border-subtle text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-text-secondary hover:bg-card-alt cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Client</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
