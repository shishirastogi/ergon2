import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Client, Invoice, Project, Quote, ProfitabilityDashboard } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { formatCurrency, formatCompactNumber } from '../utils/formatters';
import { PaymentsFunnelChart } from '../components/dashboard/PaymentsFunnelChart';
import { RetentionStepChart } from '../components/dashboard/RetentionStepChart';
import { ActivityWaffleGrid } from '../components/dashboard/ActivityWaffleGrid';
import { CategoryStripedBars } from '../components/dashboard/CategoryStripedBars';
import { FloatingAIAssistant } from '../components/dashboard/FloatingAIAssistant';
import { CurrencySelector } from '../components/dashboard/CurrencySelector';
import { useCurrency } from '../context/CurrencyContext';
import { useStudio } from '../context/StudioContext';
import { Lightbulb, Loader2, Plus, Users, FolderKanban, Receipt, Sparkles } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { dashboardCurrency, convert } = useCurrency();
  const { activeStudio } = useStudio();
  const [profitability, setProfitability] = useState<ProfitabilityDashboard | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [profData, clientData, projData, quoteData, invData] = await Promise.all([
        api.dashboard.getProfitability(),
        api.clients.getAll(),
        api.projects.getAll(),
        api.quotes.getAll(),
        api.invoices.getAll(),
      ]);

      setProfitability(profData);
      setClients(clientData || []);
      setProjects(projData || []);
      setQuotes(quoteData || []);
      setInvoices(invData || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeStudio?.id]);

  // Dynamic metrics conversion based on dashboard selected currency
  const convertedMetrics = React.useMemo(() => {
    if (!profitability) return null;

    const grossRevenueConverted = convert(profitability.grossRevenue, 'USD', dashboardCurrency);
    const outstandingAmountConverted = convert(profitability.outstandingAmount, 'USD', dashboardCurrency);

    const categoriesConverted = profitability.categories.map((c) => ({
      ...c,
      amount: convert(c.amount, 'USD', dashboardCurrency),
    }));

    return {
      grossRevenue: grossRevenueConverted,
      outstandingAmount: outstandingAmountConverted,
      categories: categoriesConverted,
    };
  }, [profitability, dashboardCurrency, convert]);

  if (loading || !profitability) {
    return (
      <div className="py-24 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
      </div>
    );
  }

  const isFreshAccount = clients.length === 0 && invoices.length === 0 && projects.length === 0;

  return (
    <div className="space-y-6">
      {/* Oversized Page Title Anchor */}
      <PageHeader
        title="Overview"
        subtitle={`${activeStudio?.name || 'Studio'} • Workspace financial overview & pipeline metrics`}
        showLinkIcon
        action={
          <div className="flex items-center gap-2">
            <CurrencySelector />
            <Link
              to="/invoices/new"
              className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 px-4 py-2 rounded-pill font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </Link>
          </div>
        }
      />

      {/* Fresh Account Quick-Start Guide */}
      {isFreshAccount && (
        <div className="p-5 sm:p-6 rounded-card bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-blue-100 dark:border-blue-900/50 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-accent-blue font-bold text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Welcome to your new studio workspace</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                Your workspace is clean and ready. Add your first client, project, or invoice.
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Every client and project you add will immediately synchronize across all studio pipelines and financial reports.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <Link
                to="/clients"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card hover:bg-card-alt text-text-primary text-xs font-bold shadow-xs border border-border-subtle"
              >
                <Users className="w-3.5 h-3.5 text-accent-blue" />
                <span>+ Add Client</span>
              </Link>
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card hover:bg-card-alt text-text-primary text-xs font-bold shadow-xs border border-border-subtle"
              >
                <FolderKanban className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ New Project</span>
              </Link>
              <Link
                to="/invoices/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white dark:border dark:border-neutral-700 text-xs font-bold shadow-sm transition-all"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-300" />
                <span>+ Create Invoice</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Multi-Column Card Grid Matching Reference Style */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Dominant Wide Card (Top Left - 8 cols on desktop): Payments Funnel & AI Bar */}
        <div className="lg:col-span-8">
          <Card
            title="Payments"
            showMoreButton
            padding="standard"
            className="flex flex-col justify-between h-full"
          >
            <PaymentsFunnelChart data={profitability.funnel} />

            {/* Signature Floating AI Assistant Input Bar */}
            <FloatingAIAssistant
              profitability={profitability}
              clients={clients}
              projects={projects}
              quotes={quotes}
              invoices={invoices}
            />
          </Card>
        </div>

        {/* Narrow Side Card (Top Right - 4 cols on desktop): Gross Volume & Category Bars */}
        <div className="lg:col-span-4">
          <Card
            title="Gross Volume"
            showMoreButton
            padding="standard"
            className="flex flex-col justify-between h-full"
          >
            <div className="space-y-4">
              {/* Hero Number & Subtitle */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-text-primary block">
                    {formatCurrency(
                      convertedMetrics?.grossRevenue ?? profitability.grossRevenue,
                      dashboardCurrency
                    ).replace('.00', '')}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Live FX
                  </span>
                </div>
                <span className="text-[11px] font-medium text-text-secondary mt-0.5 block">
                  Total transaction volume in {dashboardCurrency}
                </span>
              </div>

              {/* Quick Stat Dual Badges */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-card-alt border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">
                    Collected
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-accent-green block mt-0.5">
                    {formatCurrency(
                      convert(profitability.paidAmount, 'USD', dashboardCurrency),
                      dashboardCurrency
                    )}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-card-alt border border-border-subtle">
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">
                    Pending
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-accent-orange block mt-0.5">
                    {formatCurrency(
                      convertedMetrics?.outstandingAmount ?? profitability.outstandingAmount,
                      dashboardCurrency
                    )}
                  </span>
                </div>
              </div>

              {/* Category Breakdown Streams */}
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-2">
                  Revenue Breakdown
                </span>
                <CategoryStripedBars
                  categories={convertedMetrics?.categories || profitability.categories}
                  currencyCode={dashboardCurrency}
                />
              </div>
            </div>

            {/* Quick Receivables Footer */}
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
              <span className="text-text-secondary font-medium">Outstanding Balances</span>
              <span className="font-extrabold text-accent-orange">
                {formatCurrency(
                  convertedMetrics?.outstandingAmount ?? profitability.outstandingAmount,
                  dashboardCurrency
                )}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom 3-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {/* Bottom Left Card: Retention Staircase Chart */}
        <Card
          title="Retention"
          showMoreButton
          padding="standard"
          className="flex flex-col justify-between overflow-hidden"
        >
          <RetentionStepChart data={profitability.retentionTrend} />
          <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Quarterly cohort retention</span>
            <span className="font-bold text-text-primary">
              {invoices.length > 0 ? '+18% YoY' : '—'}
            </span>
          </div>
        </Card>

        {/* Bottom Center Card: Transactions & Waffle Dot-Grid */}
        <Card
          title="Transactions"
          showMoreButton
          padding="standard"
          className="flex flex-col justify-between"
        >
          <ActivityWaffleGrid
            data={profitability.activityMatrix}
            totalTransactions={invoices.length > 0 ? (invoices.length >= 1000 ? formatCompactNumber(invoices.length) : `${invoices.length} inv`) : '0'}
            comparison={invoices.length > 0 ? `+${invoices.length} active` : '0 active'}
          />
          <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Weekly distribution</span>
            <span className="font-bold text-emerald-700">
              {invoices.length > 0 ? 'Highest on Wednesday' : 'Awaiting transactions'}
            </span>
          </div>
        </Card>

        {/* Bottom Right Card: Signature Warm Gradient Hero Callout Card */}
        <div className="rounded-card bg-hero-gradient p-7 text-white shadow-lg shadow-orange-500/15 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle ambient light glow in corner */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Glassmorphism Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/25 shadow-xs mb-6">
              <Lightbulb className="w-3.5 h-3.5 text-amber-200" />
              <span>{profitability.heroMetric.label}</span>
            </div>

            {/* Giant White Metric Number */}
            <div className="text-5xl sm:text-6xl font-black tracking-tight text-white leading-none my-2">
              {profitability.heroMetric.value}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20">
            <p className="text-sm font-semibold text-white/95 leading-snug">
              {profitability.heroMetric.subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
