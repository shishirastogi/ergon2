export type ClientStatus = 'LEAD' | 'ACTIVE' | 'PAST';

export type ProjectStage = 'LEAD' | 'QUOTE_SENT' | 'IN_PROGRESS' | 'REVISIONS' | 'DELIVERED' | 'PAID';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface User {
  id: string;
  email: string;
  name: string;
  studioName?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  notes?: string;
  currency?: string;
  status: ClientStatus;
  totalBilled?: number;
  outstandingBalance?: number;
  createdAt: string;
  updatedAt: string;
  projects?: Project[];
}

export interface Project {
  id: string;
  title: string;
  clientId: string;
  client?: Client;
  stage: ProjectStage;
  quotedAmount: number; // strictly binds to schema field quotedAmount
  notes?: string;
  startDate?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  quotes?: Quote[];
  invoices?: Invoice[];
}

export interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitRate: number;
  total?: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  projectId: string;
  project?: Project;
  clientId?: string;
  client?: Client;
  studioId?: string;
  studio?: Studio;
  currency?: string;
  status: QuoteStatus;
  lineItems: QuoteItem[];
  subtotal: number;
  taxRate: number; // e.g. 0.1 for 10%
  taxAmount: number;
  total: number;
  notes?: string;
  validUntil?: string;
  invoiceId?: string; // Links to invoice if converted
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitRate: number;
  total?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  projectId: string;
  project?: Project;
  clientId?: string;
  client?: Client;
  studioId?: string;
  studio?: Studio;
  currency?: string;
  quoteId?: string;
  quote?: Quote;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  remainingBalance: number;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPayload {
  amount?: number;
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  value: number;
  conversionRate: number;
  dropOffRate: number;
  isFocused?: boolean;
}

export interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  colorHex: string;
  accentClass: string;
}

export interface ActivityPoint {
  day: string;
  intensity: number; // 0 to 4
  count: number;
}

export interface ProfitabilityDashboard {
  grossRevenue: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  funnel: FunnelStage[];
  retentionTrend: { step: number; label: string; value: number }[];
  activityMatrix: ActivityPoint[];
  categories: CategoryBreakdown[];
  heroMetric: {
    label: string;
    value: string;
    subtitle: string;
  };
  clientProfitability?: {
    clientName: string;
    totalPaid: number;
    projectCount: number;
  }[];
}

export interface Studio {
  id: string;
  name: string;
  tagline?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  logoUrl?: string;
  currency?: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR' | 'CHF' | 'SGD' | 'AED';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  formatLocale: string;
}
