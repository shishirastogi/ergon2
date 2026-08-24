import {
  ApiResponse,
  AuthResponse,
  Client,
  Invoice,
  InvoiceStatus,
  PaymentPayload,
  ProfitabilityDashboard,
  Project,
  Quote,
  Studio,
} from '../types';
import {
  SEED_CLIENTS,
  SEED_INVOICES,
  SEED_PROFITABILITY,
  SEED_PROJECTS,
  SEED_QUOTES,
} from './seedData';
import { generateInvoicePdf } from '../utils/pdfGenerator';

const BASE_URL = import.meta.env.VITE_API_URL || '';

// Token Storage
const TOKEN_KEY = 'ergon_auth_token';
const USER_KEY = 'ergon_auth_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, user: any): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): any | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// In-Memory Read-Through Cache for offline tolerance
const readCache = new Map<string, any>();

// User-scoped persistent Mock Database
class MockDatabase {
  private currentUserId: string = 'anonymous';
  private clients: Client[] = [];
  private projects: Project[] = [];
  private quotes: Quote[] = [];
  private invoices: Invoice[] = [];
  private profitability: ProfitabilityDashboard = SEED_PROFITABILITY;

  constructor() {
    const user = getStoredUser();
    this.currentUserId = user?.id || 'anonymous';
    this.init(false);
  }

  public loadUser(userId: string, isNewSignup: boolean = false) {
    this.currentUserId = userId;
    readCache.clear();
    this.init(isNewSignup);
  }

  private getStorageKey(entity: string): string {
    return `ergon_db_${entity}_${this.currentUserId}`;
  }

  private init(isNewSignup: boolean) {
    const isDemoAccount = this.currentUserId === 'usr_studio_01';

    if (isNewSignup) {
      // New account must be completely clean and empty
      this.clients = [];
      this.projects = [];
      this.quotes = [];
      this.invoices = [];
      this.persist();
      return;
    }

    const savedClients = localStorage.getItem(this.getStorageKey('clients'));
    const savedProjects = localStorage.getItem(this.getStorageKey('projects'));
    const savedQuotes = localStorage.getItem(this.getStorageKey('quotes'));
    const savedInvoices = localStorage.getItem(this.getStorageKey('invoices'));

    if (savedClients !== null) {
      this.clients = JSON.parse(savedClients);
      this.projects = savedProjects ? JSON.parse(savedProjects) : [];
      this.quotes = savedQuotes ? JSON.parse(savedQuotes) : [];
      this.invoices = savedInvoices ? JSON.parse(savedInvoices) : [];
    } else if (isDemoAccount) {
      // Pre-seed only for the demo/guest sandbox user
      this.clients = [...SEED_CLIENTS];
      this.projects = [...SEED_PROJECTS];
      this.quotes = [...SEED_QUOTES];
      this.invoices = [...SEED_INVOICES];
      this.persist();
    } else {
      // Default empty for new custom accounts
      this.clients = [];
      this.projects = [];
      this.quotes = [];
      this.invoices = [];
    }

    this.recalculateClientBalances();
    this.recalculateProfitability();
  }

  private persist() {
    localStorage.setItem(this.getStorageKey('clients'), JSON.stringify(this.clients));
    localStorage.setItem(this.getStorageKey('projects'), JSON.stringify(this.projects));
    localStorage.setItem(this.getStorageKey('quotes'), JSON.stringify(this.quotes));
    localStorage.setItem(this.getStorageKey('invoices'), JSON.stringify(this.invoices));
    this.recalculateClientBalances();
    this.recalculateProfitability();
  }

  private recalculateClientBalances() {
    for (const client of this.clients) {
      const clientInvoices = this.invoices.filter((i) => i.clientId === client.id);
      client.totalBilled = clientInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
      client.outstandingBalance = clientInvoices.reduce(
        (sum, i) => sum + Math.max(0, (i.total || 0) - (i.amountPaid || 0)),
        0
      );
    }
  }

  private recalculateProfitability() {
    let gross = 0;
    let paid = 0;
    let outstanding = 0;
    let overdue = 0;

    const now = new Date();

    for (const inv of this.invoices) {
      gross += inv.total;
      paid += inv.amountPaid;
      const remaining = Math.max(0, inv.total - inv.amountPaid);
      if (remaining > 0) {
        outstanding += remaining;
        const due = new Date(inv.dueDate);
        if (due < now && inv.status !== 'PAID') {
          overdue += remaining;
        }
      }
    }

    const isDemo = this.currentUserId === 'usr_studio_01';

    if (isDemo && this.invoices.length === SEED_INVOICES.length) {
      this.profitability = {
        ...SEED_PROFITABILITY,
        grossRevenue: gross,
        paidAmount: paid,
        outstandingAmount: outstanding,
        overdueAmount: overdue,
      };
      return;
    }

    // Dynamic metrics for custom accounts
    const totalTransactions = this.invoices.length;
    const paidCount = this.invoices.filter((i) => i.status === 'PAID').length;
    const partialCount = this.invoices.filter((i) => i.status === 'PARTIAL').length;
    const unpaidCount = this.invoices.filter((i) => i.status === 'UNPAID').length;

    const onlinePct = gross > 0 ? Math.round((paid / gross) * 100) : 0;
    const outstandingPct = gross > 0 ? Math.round((outstanding / gross) * 100) : 0;

    this.profitability = {
      grossRevenue: gross,
      paidAmount: paid,
      outstandingAmount: outstanding,
      overdueAmount: overdue,
      funnel: [
        {
          stage: 'initiated',
          label: 'Initiated Invoices',
          count: totalTransactions,
          value: gross,
          conversionRate: 100,
          dropOffRate: 0,
          isFocused: false,
        },
        {
          stage: 'authorized',
          label: 'Sent to Clients',
          count: unpaidCount + partialCount + paidCount,
          value: gross,
          conversionRate: gross > 0 ? 100 : 0,
          dropOffRate: 0,
          isFocused: false,
        },
        {
          stage: 'successful',
          label: 'Collected Payments',
          count: paidCount + (partialCount ? 1 : 0),
          value: paid,
          conversionRate: gross > 0 ? Math.round((paid / gross) * 100) : 0,
          dropOffRate: gross > 0 ? -Math.round((outstanding / gross) * 100) : 0,
          isFocused: true,
        },
        {
          stage: 'payouts',
          label: 'Settled to Bank',
          count: paidCount,
          value: paid,
          conversionRate: paid > 0 ? 100 : 0,
          dropOffRate: 0,
          isFocused: false,
        },
        {
          stage: 'completed',
          label: 'Completed Retainers',
          count: paidCount,
          value: paid,
          conversionRate: paid > 0 ? 100 : 0,
          dropOffRate: 0,
          isFocused: false,
        },
      ],
      retentionTrend: [
        { step: 1, label: 'W1', value: paidCount > 0 ? 35 : 0 },
        { step: 2, label: 'W2', value: paidCount > 0 ? 50 : 0 },
        { step: 3, label: 'W3', value: paidCount > 0 ? 45 : 0 },
        { step: 4, label: 'W4', value: paidCount > 0 ? 65 : 0 },
        { step: 5, label: 'W5', value: paidCount > 0 ? 75 : 0 },
        { step: 6, label: 'W6', value: paidCount > 0 ? 80 : 0 },
      ],
      activityMatrix: [
        { day: 'Mon', intensity: totalTransactions > 0 ? 2 : 0, count: totalTransactions },
        { day: 'Tue', intensity: totalTransactions > 1 ? 3 : 0, count: totalTransactions },
        { day: 'Wed', intensity: totalTransactions > 0 ? 4 : 0, count: totalTransactions },
        { day: 'Thu', intensity: totalTransactions > 1 ? 3 : 0, count: totalTransactions },
        { day: 'Fri', intensity: totalTransactions > 0 ? 2 : 0, count: totalTransactions },
        { day: 'Sat', intensity: 0, count: 0 },
        { day: 'Sun', intensity: 0, count: 0 },
      ],
      categories: [
        {
          name: 'Direct Invoices',
          amount: gross,
          percentage: gross > 0 ? 100 : 0,
          colorHex: '#2FBF71',
          accentClass: 'bg-striped-green',
        },
        {
          name: 'Collected Revenue',
          amount: paid,
          percentage: onlinePct,
          colorHex: '#3B6FE0',
          accentClass: 'bg-striped-blue',
        },
        {
          name: 'Pending Balance',
          amount: outstanding,
          percentage: outstandingPct,
          colorHex: '#F2994A',
          accentClass: 'bg-striped-orange',
        },
      ],
      heroMetric: {
        label: 'Insights',
        value: gross > 0 ? `${Math.round((paid / gross) * 100)}%` : '0%',
        subtitle:
          gross > 0
            ? 'Collection Rate on Invoiced Revenue'
            : 'Create your first invoice to generate studio insights',
      },
      clientProfitability: this.clients.map((c) => ({
        clientName: c.name,
        totalPaid: c.totalBilled || 0,
        projectCount: this.projects.filter((p) => p.clientId === c.id).length,
      })),
    };
  }

  // Clients
  getClients(): Client[] {
    return this.clients.map((c) => ({
      ...c,
      projects: this.projects.filter((p) => p.clientId === c.id),
    }));
  }

  getClient(id: string): Client | undefined {
    const client = this.clients.find((c) => c.id === id);
    if (!client) return undefined;
    return {
      ...client,
      projects: this.projects.filter((p) => p.clientId === id),
    };
  }

  createClient(data: Partial<Client>): Client {
    const newClient: Client = {
      id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name || 'New Client',
      company: data.company || '',
      email: data.email || '',
      phone: data.phone || '',
      notes: data.notes || '',
      status: data.status || 'ACTIVE',
      totalBilled: 0,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.clients.unshift(newClient);
    this.persist();
    return newClient;
  }

  updateClient(id: string, data: Partial<Client>): Client {
    const idx = this.clients.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    this.clients[idx] = {
      ...this.clients[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.clients[idx];
  }

  deleteClient(id: string): boolean {
    this.clients = this.clients.filter((c) => c.id !== id);
    this.persist();
    return true;
  }

  // Projects
  getProjects(): Project[] {
    return this.projects.map((p) => ({
      ...p,
      client: this.clients.find((c) => c.id === p.clientId),
      quotes: this.quotes.filter((q) => q.projectId === p.id),
      invoices: this.invoices.filter((i) => i.projectId === p.id),
    }));
  }

  getProject(id: string): Project | undefined {
    const project = this.projects.find((p) => p.id === id);
    if (!project) return undefined;
    return {
      ...project,
      client: this.clients.find((c) => c.id === project.clientId),
      quotes: this.quotes.filter((q) => q.projectId === id),
      invoices: this.invoices.filter((i) => i.projectId === id),
    };
  }

  createProject(data: Partial<Project>): Project {
    const newProject: Project = {
      id: `prj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title || 'Untitled Project',
      clientId: data.clientId || this.clients[0]?.id || '',
      stage: data.stage || 'LEAD',
      quotedAmount: Number(data.quotedAmount) || 0,
      notes: data.notes || '',
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      deadline: data.deadline || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.unshift(newProject);
    this.persist();
    return {
      ...newProject,
      client: this.clients.find((c) => c.id === newProject.clientId),
    };
  }

  updateProject(id: string, data: Partial<Project>): Project {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Project not found');
    this.projects[idx] = {
      ...this.projects[idx],
      ...data,
      quotedAmount:
        data.quotedAmount !== undefined ? Number(data.quotedAmount) : this.projects[idx].quotedAmount,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return {
      ...this.projects[idx],
      client: this.clients.find((c) => c.id === this.projects[idx].clientId),
    };
  }

  deleteProject(id: string): boolean {
    this.projects = this.projects.filter((p) => p.id !== id);
    this.persist();
    return true;
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  private getActiveOrFirstStudio(explicitStudioId?: string): Studio | undefined {
    const studios = this.getStudios();
    if (explicitStudioId) {
      const found = studios.find((s: Studio) => s.id === explicitStudioId);
      if (found) return found;
    }
    const savedActiveId =
      typeof window !== 'undefined'
        ? localStorage.getItem(`ergon_active_studio_${this.currentUserId}`)
        : null;
    return (
      (savedActiveId ? studios.find((s: Studio) => s.id === savedActiveId) : null) ||
      studios[0]
    );
  }

  // Quotes
  getQuotes(): Quote[] {
    const studios = this.getStudios();
    const defaultStudio = this.getActiveOrFirstStudio();
    return this.quotes.map((q) => ({
      ...q,
      studio:
        (q.studioId ? studios.find((s: Studio) => s.id === q.studioId) : null) ||
        q.studio ||
        defaultStudio,
      project: this.projects.find((p) => p.id === q.projectId),
      client: this.clients.find((c) => c.id === q.clientId),
    }));
  }

  getQuote(id: string): Quote | undefined {
    const quote = this.quotes.find((q) => q.id === id);
    if (!quote) return undefined;
    const studios = this.getStudios();
    const defaultStudio = this.getActiveOrFirstStudio(quote.studioId);
    return {
      ...quote,
      studio:
        (quote.studioId ? studios.find((s: Studio) => s.id === quote.studioId) : null) ||
        quote.studio ||
        defaultStudio,
      project: this.projects.find((p) => p.id === quote.projectId),
      client: this.clients.find((c) => c.id === quote.clientId),
    };
  }

  createQuote(data: Partial<Quote>): Quote {
    const lineItems = (data.lineItems || []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitRate: Number(item.unitRate) || 0,
      total: (Number(item.quantity) || 1) * (Number(item.unitRate) || 0),
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxRate = Number(data.taxRate) || 0;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));

    const activeStudio = this.getActiveOrFirstStudio(data.studioId);
    const studioId = data.studioId || activeStudio?.id;
    const studio = data.studio || activeStudio;

    const newQuote: Quote = {
      id: `quo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      quoteNumber: data.quoteNumber || `QUO-2026-${String(this.quotes.length + 1).padStart(3, '0')}`,
      projectId: data.projectId || this.projects[0]?.id || '',
      clientId: data.clientId || this.projects.find((p) => p.id === data.projectId)?.clientId,
      studioId,
      studio,
      status: data.status || 'DRAFT',
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: data.notes || '',
      validUntil: data.validUntil || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.quotes.unshift(newQuote);
    this.persist();
    return {
      ...newQuote,
      studio,
      project: this.projects.find((p) => p.id === newQuote.projectId),
      client: this.clients.find((c) => c.id === newQuote.clientId),
    };
  }

  updateQuote(id: string, data: Partial<Quote>): Quote {
    const idx = this.quotes.findIndex((q) => q.id === id);
    if (idx === -1) throw new Error('Quote not found');

    const quote = this.quotes[idx];
    const lineItems = (data.lineItems || quote.lineItems || []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitRate: Number(item.unitRate) || 0,
      total: (Number(item.quantity) || 1) * (Number(item.unitRate) || 0),
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxRate = data.taxRate !== undefined ? Number(data.taxRate) : quote.taxRate;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));

    const updated: Quote = {
      ...quote,
      ...data,
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      updatedAt: new Date().toISOString(),
    };

    this.quotes[idx] = updated;
    this.persist();
    return {
      ...updated,
      project: this.projects.find((p) => p.id === updated.projectId),
      client: this.clients.find((c) => c.id === updated.clientId),
    };
  }

  convertToInvoice(quoteId: string): Invoice {
    const quote = this.quotes.find((q) => q.id === quoteId);
    if (!quote) throw new Error('Quote not found');

    const issueDate = new Date().toISOString().slice(0, 10);
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    const dueDate = dueDateObj.toISOString().slice(0, 10);

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber: `INV-2026-${String(this.invoices.length + 1).padStart(3, '0')}`,
      projectId: quote.projectId,
      clientId: quote.clientId,
      quoteId: quote.id,
      status: 'UNPAID',
      issueDate,
      dueDate,
      lineItems: [...quote.lineItems],
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      total: quote.total,
      amountPaid: 0,
      remainingBalance: quote.total,
      notes: quote.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    quote.status = 'APPROVED';
    quote.invoiceId = invoice.id;

    this.invoices.unshift(invoice);
    this.persist();
    return {
      ...invoice,
      project: this.projects.find((p) => p.id === invoice.projectId),
      client: this.clients.find((c) => c.id === invoice.clientId),
      quote,
    };
  }

  // Direct Custom Invoice Creation
  createInvoice(data: Partial<Invoice>): Invoice {
    const lineItems = (data.lineItems || []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitRate: Number(item.unitRate) || 0,
      total: (Number(item.quantity) || 1) * (Number(item.unitRate) || 0),
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxRate = Number(data.taxRate) || 0;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));
    const amountPaid = Number(data.amountPaid) || 0;
    const remainingBalance = Number(Math.max(0, total - amountPaid).toFixed(2));

    let status: InvoiceStatus = data.status || 'UNPAID';
    if (remainingBalance === 0 && total > 0) {
      status = 'PAID';
    } else if (amountPaid > 0) {
      status = 'PARTIAL';
    }

    const activeStudio = this.getActiveOrFirstStudio(data.studioId);
    const studioId = data.studioId || activeStudio?.id;
    const studio = data.studio || activeStudio;

    const newInvoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber:
        data.invoiceNumber || `INV-2026-${String(this.invoices.length + 1).padStart(3, '0')}`,
      projectId: data.projectId || '',
      clientId:
        data.clientId ||
        (data.projectId ? this.projects.find((p) => p.id === data.projectId)?.clientId : '') ||
        '',
      studioId,
      studio,
      quoteId: data.quoteId,
      status,
      issueDate: data.issueDate || new Date().toISOString().slice(0, 10),
      dueDate:
        data.dueDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      amountPaid,
      remainingBalance,
      notes: data.notes || '',
      paidAt: status === 'PAID' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.invoices.unshift(newInvoice);
    this.persist();
    return {
      ...newInvoice,
      studio,
      project: this.projects.find((p) => p.id === newInvoice.projectId),
      client: this.clients.find((c) => c.id === newInvoice.clientId),
    };
  }

  // Invoices
  getInvoices(): Invoice[] {
    const studios = this.getStudios();
    const defaultStudio = this.getActiveOrFirstStudio();
    return this.invoices.map((inv) => ({
      ...inv,
      studio:
        (inv.studioId ? studios.find((s: Studio) => s.id === inv.studioId) : null) ||
        inv.studio ||
        defaultStudio,
      project: this.projects.find((p) => p.id === inv.projectId),
      client: this.clients.find((c) => c.id === inv.clientId),
      quote: this.quotes.find((q) => q.id === inv.quoteId),
    }));
  }

  getInvoice(id: string): Invoice | undefined {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) return undefined;
    const studios = this.getStudios();
    const defaultStudio = this.getActiveOrFirstStudio(inv.studioId);
    return {
      ...inv,
      studio:
        (inv.studioId ? studios.find((s: Studio) => s.id === inv.studioId) : null) ||
        inv.studio ||
        defaultStudio,
      project: this.projects.find((p) => p.id === inv.projectId),
      client: this.clients.find((c) => c.id === inv.clientId),
      quote: this.quotes.find((q) => q.id === inv.quoteId),
    };
  }

  markPaid(id: string, payload?: PaymentPayload): Invoice {
    const inv = this.invoices.find((i) => i.id === id);
    if (!inv) throw new Error('Invoice not found');

    const paymentAmount =
      payload?.amount !== undefined ? Number(payload.amount) : inv.remainingBalance;

    const newAmountPaid = Number(
      Math.min(inv.total, (inv.amountPaid || 0) + paymentAmount).toFixed(2)
    );
    const remainingBalance = Number(Math.max(0, inv.total - newAmountPaid).toFixed(2));

    inv.amountPaid = newAmountPaid;
    inv.remainingBalance = remainingBalance;

    if (remainingBalance === 0) {
      inv.status = 'PAID';
      inv.paidAt = new Date().toISOString();
    } else if (newAmountPaid > 0) {
      inv.status = 'PARTIAL';
    } else {
      inv.status = 'UNPAID';
    }

    inv.updatedAt = new Date().toISOString();
    this.persist();
    return {
      ...inv,
      project: this.projects.find((p) => p.id === inv.projectId),
      client: this.clients.find((c) => c.id === inv.clientId),
    };
  }

  getProfitability(): ProfitabilityDashboard {
    this.recalculateProfitability();
    return this.profitability;
  }

  // Studios Management
  public getStudios(): Studio[] {
    const raw = localStorage.getItem(`ergon_studios_${this.currentUserId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return (parsed || []).map((s: Studio) => ({
          ...s,
          email: s.email && !s.email.includes('@ergon.') ? s.email : '',
          website: s.website && !s.website.includes('ergon.') ? s.website : '',
        }));
      } catch {
        return [];
      }
    }
    const user = getStoredUser();
    const userEmail = user?.email && !user.email.includes('@ergon.') ? user.email : '';
    const defaultStudio: Studio = {
      id: `studio_${this.currentUserId}`,
      name: user?.studioName || 'Studio Workspace',
      tagline: '',
      email: userEmail,
      website: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const initial = [defaultStudio];
    localStorage.setItem(`ergon_studios_${this.currentUserId}`, JSON.stringify(initial));
    return initial;
  }

  public getStudio(id: string): Studio {
    const studios = this.getStudios();
    const studio = studios.find((s) => s.id === id);
    if (!studio) throw new Error('Studio not found');
    return studio;
  }

  public createStudio(data: Partial<Studio>): Studio {
    const studios = this.getStudios();
    if (studios.length >= 5) {
      throw new Error('Maximum 5 studios allowed per workspace.');
    }
    const newStudio: Studio = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name || 'New Studio',
      tagline: data.tagline || '',
      email: data.email || '',
      phone: data.phone || '',
      website: data.website || '',
      address: data.address || '',
      logoUrl: data.logoUrl || '',
      currency: data.currency || 'USD',
      taxId: data.taxId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    studios.push(newStudio);
    localStorage.setItem(`ergon_studios_${this.currentUserId}`, JSON.stringify(studios));
    return newStudio;
  }

  public updateStudio(id: string, data: Partial<Studio>): Studio {
    const studios = this.getStudios();
    const idx = studios.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Studio not found');
    studios[idx] = {
      ...studios[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`ergon_studios_${this.currentUserId}`, JSON.stringify(studios));
    return studios[idx];
  }

  public deleteStudio(id: string): { success: boolean } {
    let studios = this.getStudios();
    if (studios.length <= 1) {
      throw new Error('You must have at least one active studio.');
    }
    studios = studios.filter((s) => s.id !== id);
    localStorage.setItem(`ergon_studios_${this.currentUserId}`, JSON.stringify(studios));
    return { success: true };
  }
}

export const mockDb = new MockDatabase();

// Core API Request Dispatcher with Auth & Read-Through Cache
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      clearStoredAuth();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (response.ok) {
      if (endpoint.includes('/pdf')) {
        const blob = await response.blob();
        return blob as unknown as T;
      }

      const json: ApiResponse<T> = await response.json();
      if (json.error) {
        throw new Error(json.error.message || 'API request error');
      }

      if (isGet && json.data) {
        readCache.set(endpoint, json.data);
      }
      return json.data as T;
    }

    try {
      const errJson = await response.json();
      throw new Error(errJson.error?.message || `Server responded with status ${response.status}`);
    } catch (e: any) {
      throw new Error(e.message || `HTTP ${response.status}`);
    }
  } catch (networkOrServerError: any) {
    return handleFallbackRequest<T>(endpoint, options, isGet, networkOrServerError);
  }
}

// Fallback dispatcher ensuring seamless interaction and testing
function handleFallbackRequest<T>(
  endpoint: string,
  options: RequestInit,
  isGet: boolean,
  originalError: any
): T {
  if (isGet && readCache.has(endpoint)) {
    return readCache.get(endpoint);
  }

  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};

  // Auth routes are NEVER mocked â€” a fake session here would look like a
  // successful login, then immediately bounce off the backend with 401
  // (the "logged in for a second then kicked out" bug). Surface real errors.
  if (endpoint.startsWith('/api/auth')) {
    throw new Error(
      'Cannot reach the server right now. Check your connection and try again.'
    );
  }

  // Clients
  if (endpoint === '/api/clients') {
    if (method === 'GET') return mockDb.getClients() as unknown as T;
    if (method === 'POST') return mockDb.createClient(body) as unknown as T;
  }
  if (endpoint.startsWith('/api/clients/')) {
    const id = endpoint.split('/')[3];
    if (method === 'GET') return mockDb.getClient(id) as unknown as T;
    if (method === 'PUT') return mockDb.updateClient(id, body) as unknown as T;
    if (method === 'DELETE') return { success: mockDb.deleteClient(id) } as unknown as T;
  }

  // Projects
  if (endpoint === '/api/projects') {
    if (method === 'GET') return mockDb.getProjects() as unknown as T;
    if (method === 'POST') return mockDb.createProject(body) as unknown as T;
  }
  if (endpoint.startsWith('/api/projects/')) {
    const id = endpoint.split('/')[3];
    if (method === 'GET') return mockDb.getProject(id) as unknown as T;
    if (method === 'PUT') return mockDb.updateProject(id, body) as unknown as T;
    if (method === 'DELETE') return { success: mockDb.deleteProject(id) } as unknown as T;
  }

  // Quotes
  if (endpoint === '/api/quotes') {
    if (method === 'GET') return mockDb.getQuotes() as unknown as T;
    if (method === 'POST') return mockDb.createQuote(body) as unknown as T;
  }
  if (endpoint.startsWith('/api/quotes/')) {
    const parts = endpoint.split('/');
    const id = parts[3];
    if (parts[4] === 'convert-to-invoice' && method === 'POST') {
      return mockDb.convertToInvoice(id) as unknown as T;
    }
    if (method === 'GET') return mockDb.getQuote(id) as unknown as T;
    if (method === 'PUT') return mockDb.updateQuote(id, body) as unknown as T;
  }

  // Invoices
  if (endpoint === '/api/invoices') {
    if (method === 'GET') return mockDb.getInvoices() as unknown as T;
    if (method === 'POST') return mockDb.createInvoice(body) as unknown as T;
  }
  if (endpoint.startsWith('/api/invoices/')) {
    const parts = endpoint.split('/');
    const id = parts[3];
    if (parts[4] === 'mark-paid' && method === 'POST') {
      return mockDb.markPaid(id, body) as unknown as T;
    }
    if (parts[4] === 'pdf') {
      try {
        const inv = mockDb.getInvoice(id);
        const studios = mockDb.getStudios();
        const savedActiveId =
          typeof window !== 'undefined'
            ? localStorage.getItem(`ergon_active_studio_${mockDb.getCurrentUserId()}`)
            : null;
        const studio =
          (inv?.studioId ? studios.find((s) => s.id === inv.studioId) : null) ||
          inv?.studio ||
          (savedActiveId ? studios.find((s) => s.id === savedActiveId) : null) ||
          studios[0];
        if (inv) {
          const pdfBlob = generateInvoicePdf(inv, studio);
          return pdfBlob as unknown as T;
        }
      } catch {
        // Fallback below
      }
      const mockPdfBlob = new Blob(
        [`%PDF-1.4\n%ERGON STUDIO INVOICE\nInvoice ID: ${id}\nDate: ${new Date().toISOString()}`],
        { type: 'application/pdf' }
      );
      return mockPdfBlob as unknown as T;
    }
    if (method === 'GET') return mockDb.getInvoice(id) as unknown as T;
  }

  // Studios
  if (endpoint === '/api/studios') {
    if (method === 'GET') return mockDb.getStudios() as unknown as T;
    if (method === 'POST') return mockDb.createStudio(body) as unknown as T;
  }
  if (endpoint.startsWith('/api/studios/')) {
    const id = endpoint.split('/')[3];
    if (method === 'GET') return mockDb.getStudio(id) as unknown as T;
    if (method === 'PUT') return mockDb.updateStudio(id, body) as unknown as T;
    if (method === 'DELETE') return mockDb.deleteStudio(id) as unknown as T;
  }

  // Dashboard
  if (endpoint === '/api/dashboard/profitability') {
    return mockDb.getProfitability() as unknown as T;
  }

  throw originalError;
}

// Typed API Endpoints Interface
export const api = {
  auth: {
    login: (body: { email: string; password?: string }) =>
      apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    signup: (body: { email: string; password?: string; name: string; studioName?: string }) =>
      apiRequest<AuthResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    googleLogin: (body?: { email?: string; name?: string }) =>
      apiRequest<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(body || {}),
      }),
    guest: () =>
      apiRequest<AuthResponse>('/api/auth/guest', {
        method: 'POST',
        body: '{}',
      }),
  },
  clients: {
    getAll: () => apiRequest<Client[]>('/api/clients'),
    getById: (id: string) => apiRequest<Client>(`/api/clients/${id}`),
    create: (data: Partial<Client>) =>
      apiRequest<Client>('/api/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Client>) =>
      apiRequest<Client>(`/api/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/clients/${id}`, {
        method: 'DELETE',
      }),
  },
  projects: {
    getAll: () => apiRequest<Project[]>('/api/projects'),
    getById: (id: string) => apiRequest<Project>(`/api/projects/${id}`),
    create: (data: Partial<Project>) =>
      apiRequest<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Project>) =>
      apiRequest<Project>(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/projects/${id}`, {
        method: 'DELETE',
      }),
  },
  quotes: {
    getAll: () => apiRequest<Quote[]>('/api/quotes'),
    getById: (id: string) => apiRequest<Quote>(`/api/quotes/${id}`),
    create: (data: Partial<Quote>) =>
      apiRequest<Quote>('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Quote>) =>
      apiRequest<Quote>(`/api/quotes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    convertToInvoice: (id: string) =>
      apiRequest<Invoice>(`/api/quotes/${id}/convert-to-invoice`, {
        method: 'POST',
      }),
  },
  invoices: {
    getAll: () => apiRequest<Invoice[]>('/api/invoices'),
    getById: (id: string) => apiRequest<Invoice>(`/api/invoices/${id}`),
    create: (data: Partial<Invoice>) =>
      apiRequest<Invoice>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markPaid: (id: string, payload?: PaymentPayload) =>
      apiRequest<Invoice>(`/api/invoices/${id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    getPdf: (id: string) => apiRequest<Blob>(`/api/invoices/${id}/pdf`),
  },
  studios: {
    getAll: () => apiRequest<Studio[]>('/api/studios'),
    getById: (id: string) => apiRequest<Studio>(`/api/studios/${id}`),
    create: (data: Partial<Studio>) =>
      apiRequest<Studio>('/api/studios', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Studio>) =>
      apiRequest<Studio>(`/api/studios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/studios/${id}`, {
        method: 'DELETE',
      }),
  },
  dashboard: {
    getProfitability: () => apiRequest<ProfitabilityDashboard>('/api/dashboard/profitability'),
  },
};
