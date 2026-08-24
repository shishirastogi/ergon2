import { prisma } from '../db.js';
import { num } from '../utils/money.js';

/**
 * Profitability dashboard service.
 *
 * RESPONSE SHAPE CONTRACT — keep stable; the React dashboard depends on it
 * (see src/types/index.ts → ProfitabilityDashboard on the frontend):
 *
 * {
 *   grossRevenue: number        — Σ invoice.total over ALL issued invoices
 *   paidAmount: number          — Σ amountPaid across invoices
 *   outstandingAmount: number   — Σ remaining balance on not-fully-paid invoices
 *   overdueAmount: number       — portion of outstanding that is past dueDate
 *   funnel: [{ stage,label,count,value,conversionRate,dropOffRate,isFocused }]
 *                               — project pipeline LEAD→PAID (count=#projects,
 *                                 value=Σ quotedAmount per stage)
 *   retentionTrend: [{ step,label,value }]  — weekly revenue collected, last 12 weeks
 *   activityMatrix: [{ day,intensity,count }]— invoice activity by weekday (90d)
 *   categories: [{ name,amount,percentage,colorHex,accentClass }] — top-3 clients
 *                               by share of paid revenue
 *   heroMetric: { label,value,subtitle }    — collection rate %
 *   clientProfitability: [{ clientName,totalPaid,projectCount }] — top 4 by paid
 *
 * Backend-spec extensions (extra keys, safe for the frontend which reads the
 * documented keys only):
 *   period: { from,to }
 *   totals: { invoicedCount, projectsCount, clientsCount }
 *   clientProfitabilityDetailed: [{ clientId,clientName,revenue,hoursLogged,revenuePerHour }]
 *                               — revenue = Σ PAID invoice totals (spec §4)
 *   projectProfitability: same shape per project
 *   mostProfitableClient / leastProfitableClient: { clientId,clientName,revenuePerHour }
 *                               — ranked by revenuePerHour (null when no hours logged)
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FUNNEL_STAGES = [
  ['LEAD', 'Lead'],
  ['QUOTE_SENT', 'Quote Sent'],
  ['IN_PROGRESS', 'In Progress'],
  ['REVISIONS', 'Revisions'],
  ['DELIVERED', 'Delivered'],
  ['PAID', 'Paid'],
];
// Accent palette mirrors the frontend's striped-bar accent classes.
const CATEGORY_COLORS = [
  { colorHex: '#2FBF71', accentClass: 'bg-striped-green' },
  { colorHex: '#3B6FE0', accentClass: 'bg-striped-blue' },
  { colorHex: '#E85D9A', accentClass: 'bg-striped-pink' },
];

function parseRange(query) {
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : null;
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : null;
  return {
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    to: to && !Number.isNaN(to.getTime()) ? to : null,
  };
}

export async function getProfitability(userId, query = {}) {
  const { from, to } = parseRange(query);
  const createdFilter = {};
  if (from) createdFilter.gte = from;
  if (to) createdFilter.lte = to;

  // ── Load everything in a handful of parallel scoped queries ───────────────
  const [invoices, projects, clients] = await Promise.all([
    prisma.invoice.findMany({
      where: { project: { client: { userId } }, ...(from || to ? { createdAt: createdFilter } : {}) },
      include: { project: true },
    }),
    prisma.project.findMany({
      where: { client: { userId }, ...(from || to ? { createdAt: createdFilter } : {}) },
    }),
    prisma.client.findMany({ where: { userId } }),
  ]);

  // ── Money rollups ─────────────────────────────────────────────────────────
  let grossRevenue = 0;
  let paidAmount = 0;
  let outstandingAmount = 0;
  let overdueAmount = 0;

  for (const inv of invoices) {
    const total = num(inv.total);
    const paid = num(inv.amountPaid);
    grossRevenue += total;
    paidAmount += paid;
    if (inv.status !== 'PAID') {
      const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
      outstandingAmount += remaining;
      if (inv.dueDate && new Date(inv.dueDate).getTime() < Date.now()) {
        overdueAmount += remaining;
      }
    }
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  grossRevenue = r2(grossRevenue);
  paidAmount = r2(paidAmount);
  outstandingAmount = r2(outstandingAmount);
  overdueAmount = r2(overdueAmount);

  // ── Pipeline funnel ───────────────────────────────────────────────────────
  const funnel = FUNNEL_STAGES.map(([stage, label], i) => {
    const inStage = projects.filter((p) => p.status === stage);
    const value = inStage.reduce((s, p) => s + num(p.quotedAmount), 0);
    const conversionRate =
      projects.length > 0 ? Math.round((inStage.length / projects.length) * 100) : 0;
    const prevCount =
      i === 0 ? projects.length : projects.filter((p) => p.status === FUNNEL_STAGES[i - 1][0]).length;
    const dropOffRate =
      prevCount > 0 ? -Math.round(((prevCount - inStage.length) / prevCount) * 100) : 0;
    return {
      stage,
      label,
      count: inStage.length,
      value: r2(value),
      conversionRate,
      dropOffRate,
      isFocused: stage === 'IN_PROGRESS',
    };
  });

  // ── Weekly collections trend (12 weeks) ───────────────────────────────────
  const now = new Date();
  const retentionTrend = [];
  for (let w = 11; w >= 0; w -= 1) {
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    const weekPaid = invoices.reduce((sum, inv) => {
      const stamp = inv.paidDate ?? (inv.amountPaid > 0 ? inv.updatedAt : null);
      if (!stamp) return sum;
      const t = new Date(stamp).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime()
        ? sum + num(inv.amountPaid)
        : sum;
    }, 0);
    retentionTrend.push({
      step: 12 - w,
      label: `W${12 - w}`,
      value: r2(weekPaid),
    });
  }

  // ── Weekday activity matrix (last 90 days of invoicing) ───────────────────
  const since90 = now.getTime() - 90 * DAY_MS;
  const counts = Array(7).fill(0);
  for (const inv of invoices) {
    const t = new Date(inv.createdAt).getTime();
    if (t < since90) continue;
    // getDay(): 0=Sun … 6=Sat → map into Mon-first index
    counts[(new Date(t).getDay() + 6) % 7] += 1;
  }
  const maxCount = Math.max(...counts, 1);
  const activityMatrix = WEEKDAYS.map((day, i) => ({
    day,
    intensity: Math.round((counts[i] / maxCount) * 4), // 0–4 buckets like the frontend grid
    count: counts[i],
  }));

  // ── Per-client profitability (spec: revenue vs hoursLogged → revenuePerHour)
  const clientIdToName = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  function profitabilityFor(groupKeyFn) {
    const map = new Map();
    for (const inv of invoices) {
      if (inv.status !== 'PAID') continue; // spec: revenue counts PAID invoices only
      const key = groupKeyFn(inv);
      if (!key) continue;
      const entry = map.get(key) ?? { revenue: 0, hoursLogged: 0 };
      entry.revenue += num(inv.total);
      map.set(key, entry);
    }
    return map;
  }

  const clientMap = profitabilityFor((inv) => inv.project?.clientId);
  const clientProfitabilityDetailed = [];
  for (const [clientId, { revenue }] of clientMap) {
    const hours = projects
      .filter((p) => p.clientId === clientId)
      .reduce((s, p) => s + num(p.hoursLogged), 0);
    const revenueNum = r2(revenue);
    clientProfitabilityDetailed.push({
      clientId,
      clientName: clientIdToName[clientId] ?? 'Unknown',
      revenue: revenueNum,
      hoursLogged: r2(hours),
      revenuePerHour: hours > 0 ? r2(revenueNum / hours) : null,
    });
  }
  clientProfitabilityDetailed.sort((a, b) => b.revenue - a.revenue);

  const projectMap = profitabilityFor((inv) => inv.projectId);
  const projectProfitability = [];
  for (const [projectId, { revenue }] of projectMap) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) continue;
    const revenueNum = r2(revenue);
    const hours = num(project.hoursLogged);
    projectProfitability.push({
      projectId,
      projectTitle: project.title,
      clientName: clientIdToName[project.clientId] ?? 'Unknown',
      revenue: revenueNum,
      hoursLogged: r2(hours),
      revenuePerHour: hours > 0 ? r2(revenueNum / hours) : null,
    });
  }
  projectProfitability.sort((a, b) => b.revenue - a.revenue);

  const rankedByRph = [...clientProfitabilityDetailed]
    .filter((c) => c.revenuePerHour !== null)
    .sort((a, b) => b.revenuePerHour - a.revenuePerHour);
  const mostProfitableClient = rankedByRph[0]
    ? {
        clientId: rankedByRph[0].clientId,
        clientName: rankedByRph[0].clientName,
        revenuePerHour: rankedByRph[0].revenuePerHour,
      }
    : null;
  const leastProfitableClient = rankedByRph.length > 1
    ? {
        clientId: rankedByRph[rankedByRph.length - 1].clientId,
        clientName: rankedByRph[rankedByRph.length - 1].clientName,
        revenuePerHour: rankedByRph[rankedByRph.length - 1].revenuePerHour,
      }
    : null;

  // ── Frontend-shaped aggregates ────────────────────────────────────────────
  const paidTotalForShare = paidAmount || 1;
  const categories = clientProfitabilityDetailed.slice(0, 3).map((c, i) => ({
    name: c.clientName,
    amount: c.revenue,
    percentage: Math.round((c.revenue / paidTotalForShare) * 100),
    ...CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const collectionRate =
    grossRevenue > 0 ? Math.round((paidAmount / grossRevenue) * 100) : 0;

  const clientProfitability = clientProfitabilityDetailed.slice(0, 4).map((c) => ({
    clientName: c.clientName,
    totalPaid: c.revenue,
    projectCount: projects.filter((p) => p.clientId === c.clientId).length,
  }));

  return {
    period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    grossRevenue,
    paidAmount,
    outstandingAmount,
    overdueAmount,

    funnel,
    retentionTrend,
    activityMatrix,
    categories,
    heroMetric: {
      label: 'Insights',
      value: `${collectionRate}%`,
      subtitle: 'Collection Rate — Paid Share of Total Invoiced Revenue',
    },
    clientProfitability,

    totals: {
      invoicedCount: invoices.length,
      projectsCount: projects.length,
      clientsCount: clients.length,
    },
    clientProfitabilityDetailed,
    projectProfitability,
    mostProfitableClient,
    leastProfitableClient,
  };
}
