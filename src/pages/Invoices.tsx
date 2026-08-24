import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Invoice, InvoiceStatus } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Search,
  Building,
  ArrowUpRight,
  Receipt,
  Loader2,
  Calendar,
  Plus,
} from 'lucide-react';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.invoices.getAll();
      setInvoices(data || []);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesFilter = statusFilter === 'ALL' || inv.status === statusFilter;
    const invNum = inv.invoiceNumber.toLowerCase();
    const pTitle = inv.project?.title?.toLowerCase() || '';
    const cName = inv.client?.name?.toLowerCase() || '';
    const cComp = inv.client?.company?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = invNum.includes(q) || pTitle.includes(q) || cName.includes(q) || cComp.includes(q);
    return matchesFilter && matchesSearch;
  });

  const totalGross = invoices.reduce((acc, i) => acc + (i.total || 0), 0);
  const totalPaid = invoices.reduce((acc, i) => acc + (i.amountPaid || 0), 0);
  const totalOutstanding = invoices.reduce(
    (acc, i) => acc + Math.max(0, (i.total || 0) - (i.amountPaid || 0)),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle={`Gross Volume: ${formatCurrency(totalGross)} • Total Collected: ${formatCurrency(totalPaid)}`}
        action={
          <Link
            to="/invoices/new"
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 px-5 py-2.5 rounded-pill font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </Link>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card padding="standard" className="flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Gross Billed
          </span>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
              {formatCurrency(totalGross)}
            </span>
            <p className="text-[11px] text-text-secondary mt-1 font-medium">All generated studio invoices</p>
          </div>
        </Card>

        <Card padding="standard" className="flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-green">
            Total Collected
          </span>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-700 tracking-tight">
              {formatCurrency(totalPaid)}
            </span>
            <p className="text-[11px] text-text-secondary mt-1 font-medium">Settled to bank account</p>
          </div>
        </Card>

        <Card padding="standard" className="flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-orange">
            Outstanding Receivables
          </span>
          <div className="mt-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-accent-orange tracking-tight">
              {formatCurrency(totalOutstanding)}
            </span>
            <p className="text-[11px] text-text-secondary mt-1 font-medium">Unpaid & partial balances</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'] as const).map((filter) => {
            const count =
              filter === 'ALL'
                ? invoices.length
                : invoices.filter((i) => i.status === filter).length;
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
                {filter === 'ALL' ? 'All Invoices' : filter.charAt(0) + filter.slice(1).toLowerCase()}
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
            placeholder="Search invoices, clients..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-card-alt border border-border-subtle text-xs font-medium text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
          />
        </div>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="py-24 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="text-center py-16">
          <Receipt className="w-12 h-12 text-text-secondary opacity-40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-text-primary">No invoices found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search criteria.'
              : 'Create a custom invoice or convert an approved quote from the project pipeline.'}
          </p>
          {!searchQuery && (
            <Link
              to="/invoices/new"
              className="mt-4 inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-full shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Invoice
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredInvoices.map((invoice) => {
            const isPartial = invoice.status === 'PARTIAL';
            const remaining = Math.max(0, invoice.total - (invoice.amountPaid || 0));

            return (
              <Link
                key={invoice.id}
                to={`/invoices/${invoice.id}`}
                className="group block focus:outline-none"
              >
                <Card
                  padding="standard"
                  className="h-full flex flex-col justify-between hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-text-secondary">
                          {invoice.invoiceNumber}
                        </span>
                        <h3 className="text-base font-bold text-text-primary group-hover:text-accent-blue transition-colors mt-0.5">
                          {invoice.project?.title || 'Studio Project'}
                        </h3>
                      </div>
                      <StatusBadge status={invoice.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-text-secondary my-3">
                      <Building className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                      <span className="truncate">
                        {invoice.client?.company || invoice.client?.name || 'Studio Client'}
                      </span>
                    </div>

                    <div className="text-[11px] text-text-secondary space-y-1.5 mb-4 bg-card-alt p-3 rounded-xl border border-border-subtle/60">
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-text-secondary" /> Due Date:
                        </span>
                        <span className={`font-semibold ${invoice.status === 'OVERDUE' ? 'text-accent-red font-bold' : 'text-text-primary'}`}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </div>

                      {isPartial && (
                        <>
                          <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                            <span>Paid So Far:</span>
                            <span className="font-bold">{formatCurrency(invoice.amountPaid)}</span>
                          </div>
                          <div className="flex justify-between text-accent-orange font-medium pt-1 border-t border-border-subtle/60">
                            <span>Remaining Balance:</span>
                            <span className="font-extrabold">{formatCurrency(remaining)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border-subtle/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                        Invoice Total
                      </span>
                      <span className="text-base font-extrabold text-text-primary">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-card-alt flex items-center justify-center text-text-secondary group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-neutral-800 dark:group-hover:text-white transition-colors">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
