import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Quote, QuoteStatus } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Plus,
  Search,
  FileText,
  Building,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | QuoteStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const data = await api.quotes.getAll();
      setQuotes(data || []);
    } catch (err) {
      console.error('Failed to load quotes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleConvertToInvoice = async (e: React.MouseEvent, quoteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setConvertingId(quoteId);
      const invoice = await api.quotes.convertToInvoice(quoteId);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      console.error('Failed to convert quote to invoice', err);
    } finally {
      setConvertingId(null);
    }
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesFilter = statusFilter === 'ALL' || quote.status === statusFilter;
    const qNum = quote.quoteNumber.toLowerCase();
    const pTitle = quote.project?.title?.toLowerCase() || '';
    const cName = quote.client?.name?.toLowerCase() || '';
    const cComp = quote.client?.company?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = qNum.includes(q) || pTitle.includes(q) || cName.includes(q) || cComp.includes(q);
    return matchesFilter && matchesSearch;
  });

  const totalQuotesValue = quotes.reduce((acc, q) => acc + (q.total || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        subtitle={`Total Proposed Value: ${formatCurrency(totalQuotesValue)} across ${quotes.length} studio proposals`}
        action={
          <Link
            to="/quotes/new"
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 px-5 py-2.5 rounded-pill font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quote</span>
          </Link>
        }
      />

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED'] as const).map((filter) => {
            const count = filter === 'ALL' ? quotes.length : quotes.filter((q) => q.status === filter).length;
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
                {filter === 'ALL' ? 'All Quotes' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === filter ? 'bg-white/20 text-white dark:bg-white/10 dark:text-neutral-200' : 'bg-card-alt text-text-secondary'
                }`}>
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
            placeholder="Search quotes, clients..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-card-alt border border-border-subtle text-xs font-medium text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
        </div>
      ) : filteredQuotes.length === 0 ? (
        <Card className="text-center py-16">
          <FileText className="w-12 h-12 text-text-secondary opacity-40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-text-primary">No quotes found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create a new line-item quote for your studio projects.'}
          </p>
          {!searchQuery && (
            <Link
              to="/quotes/new"
              className="mt-4 inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-full shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Quote
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuotes.map((quote) => {
            const isConverted = !!quote.invoiceId;
            return (
              <Link
                key={quote.id}
                to={`/quotes/${quote.id}`}
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
                          {quote.quoteNumber}
                        </span>
                        <h3 className="text-base font-bold text-text-primary group-hover:text-accent-blue transition-colors mt-0.5">
                          {quote.project?.title || 'Project Scope'}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={quote.status} size="sm" />
                        {isConverted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Converted
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-text-secondary my-3">
                      <Building className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                      <span className="truncate">
                        {quote.client?.company || quote.client?.name || 'Studio Client'}
                      </span>
                    </div>

                    <div className="text-[11px] text-text-secondary space-y-1 mb-4 bg-card-alt p-2.5 rounded-xl border border-border-subtle/60">
                      <div className="flex justify-between">
                        <span>Line Items:</span>
                        <span className="font-semibold text-text-primary">{quote.lineItems?.length || 0} items</span>
                      </div>
                      {quote.validUntil && (
                        <div className="flex justify-between">
                          <span>Valid Until:</span>
                          <span className="font-medium text-text-primary">{formatDate(quote.validUntil)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border-subtle/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                        Total Amount
                      </span>
                      <span className="text-base font-extrabold text-text-primary">
                        {formatCurrency(quote.total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isConverted && quote.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={(e) => handleConvertToInvoice(e, quote.id)}
                          disabled={convertingId === quote.id}
                          className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-text-inverse text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {convertingId === quote.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Receipt className="w-3 h-3" />
                          )}
                          <span>To Invoice</span>
                        </button>
                      )}

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
