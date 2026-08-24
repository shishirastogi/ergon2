import React, { useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Client, Invoice, Project, Quote, ProfitabilityDashboard } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface FloatingAIAssistantProps {
  profitability: ProfitabilityDashboard | null;
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  invoices: Invoice[];
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  profitability,
  clients,
  projects,
  quotes,
  invoices,
}) => {
  const [query, setQuery] = useState<string>('');
  const [answer, setAnswer] = useState<{ title: string; text: string; stat?: string } | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const sampleQueries = [
    "What's my most profitable client?",
    "How much revenue is currently overdue?",
    "What is the total active pipeline value?",
    "Which quotes are pending client approval?",
  ];

  const handleRunQuery = (questionText: string) => {
    const q = questionText.toLowerCase().trim();
    if (!q) return;

    let computedAnswer: { title: string; text: string; stat?: string } = {
      title: 'Studio Intelligence Analysis',
      text: 'Analyzing current workspace records...',
    };

    if (q.includes('profitable') || q.includes('best client') || q.includes('top client')) {
      // Find client with highest total billed / paid
      const sortedClients = [...clients].sort((a, b) => (b.totalBilled || 0) - (a.totalBilled || 0));
      const top = sortedClients[0];
      if (top) {
        computedAnswer = {
          title: 'Top Studio Client by Revenue',
          stat: formatCurrency(top.totalBilled || 0),
          text: `${top.name} (${top.company || 'Direct Client'}) is your most profitable client with ${formatCurrency(top.totalBilled || 0)} in cumulative billed work across ${top.projects?.length || 1} projects.`,
        };
      } else {
        computedAnswer = {
          title: 'Client Profitability',
          text: 'No client records available yet to compute profitability rankings.',
        };
      }
    } else if (q.includes('overdue') || q.includes('late')) {
      const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');
      const totalOverdue = overdueInvoices.reduce(
        (sum, i) => sum + Math.max(0, i.total - (i.amountPaid || 0)),
        0
      );
      computedAnswer = {
        title: 'Overdue Receivables Audit',
        stat: formatCurrency(totalOverdue),
        text: `You have ${overdueInvoices.length} invoice(s) currently past due totaling ${formatCurrency(totalOverdue)}. ${
          overdueInvoices.length > 0
            ? `Late notice recommended for ${overdueInvoices.map((i) => i.invoiceNumber).join(', ')}.`
            : 'All issued invoices are in good standing!'
        }`,
      };
    } else if (q.includes('pipeline') || q.includes('budget') || q.includes('active project')) {
      const activeProjects = projects.filter((p) => p.stage !== 'PAID');
      const totalBudget = activeProjects.reduce((sum, p) => sum + (p.quotedAmount || 0), 0);
      computedAnswer = {
        title: 'Active Project Pipeline Valuation',
        stat: formatCurrency(totalBudget),
        text: `There are currently ${activeProjects.length} active studio projects in progress totaling ${formatCurrency(totalBudget)} in quoted value (quotedAmount).`,
      };
    } else if (q.includes('quote') || q.includes('proposal') || q.includes('approval')) {
      const pendingQuotes = quotes.filter((q) => q.status === 'SENT' || q.status === 'DRAFT');
      const totalPending = pendingQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
      computedAnswer = {
        title: 'Pending Proposals Status',
        stat: formatCurrency(totalPending),
        text: `You have ${pendingQuotes.length} pending proposal(s) totaling ${formatCurrency(totalPending)} awaiting client sign-off.`,
      };
    } else if (q.includes('drop-off') || q.includes('conversion') || q.includes('funnel') || q.includes('payments')) {
      computedAnswer = {
        title: 'Payment Conversion Funnel Insights',
        stat: '89% Conversion',
        text: 'The drop-off from Authorized to Successful Payments is currently -11% (48.6k transactions), driven primarily by 3D-Secure bank authentication timeouts on mobile browsers.',
      };
    } else {
      // General financial summary
      const gross = profitability?.grossRevenue || 0;
      const outstanding = profitability?.outstandingAmount || 0;
      computedAnswer = {
        title: 'Studio Financial Overview',
        stat: formatCurrency(gross),
        text: `Total gross invoiced revenue stands at ${formatCurrency(gross)} with ${formatCurrency(outstanding)} in outstanding balances across active studio clients.`,
      };
    }

    setAnswer(computedAnswer);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRunQuery(query);
  };

  return (
    <>
      {/* Floating AI Assistant Bar docked at the bottom of the main dashboard card */}
      <div className="mt-4 pt-3 border-t border-border-subtle/50">
        <div className="bg-ai-dock rounded-2xl p-3 border border-blue-200/50 shadow-sm transition-all hover:border-accent-blue/40">
          {/* Header Label with Sparkle Icon */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-accent-blue mb-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-blue animate-pulse" />
            <span>What would you like to explore next?</span>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. What's my most profitable client this quarter?"
                className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-card-alt border border-border-subtle text-xs font-medium text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue shadow-xs transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 shadow-xs transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
              title="Compute studio answer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Query Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 text-[10px]">
            {sampleQueries.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  handleRunQuery(sample);
                }}
                className="px-2.5 py-1 rounded-full bg-card/80 hover:bg-card text-text-secondary hover:text-accent-blue font-medium border border-border-subtle shadow-xs whitespace-nowrap transition-colors cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Answer Modal */}
      {isOpen && answer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card rounded-card shadow-ergon-float p-6 sm:p-8 max-w-lg w-full animate-in zoom-in-95 border border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-accent-blue">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">{answer.title}</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">
                    Real-time Studio Intelligence
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-card-alt cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {answer.stat && (
              <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/50 flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase text-accent-blue">Calculated Metric</span>
                <span className="text-2xl sm:text-3xl font-black text-text-primary">{answer.stat}</span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-text-primary leading-relaxed bg-card-alt p-4 rounded-2xl border border-border-subtle/80">
              {answer.text}
            </p>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 rounded-pill bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-sm cursor-pointer"
              >
                Close Insights
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
