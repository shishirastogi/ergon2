/**
 * Ergon database seed — realistic sample data in varied statuses so the
 * backend and frontend have meaningful data to build against immediately.
 *
 * Dates are computed RELATIVE TO NOW, so PARTIAL/OVERDUE/PAID states stay
 * correct no matter when the seed runs.
 *
 * Demo login:  alex@ergonstudio.design  /  ergon-demo-2026
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { computeTotals } from '../src/utils/money.js';

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const daysAhead = (n) => new Date(Date.now() + n * DAY);

async function main() {
  console.log('Seeding Ergon database…');

  // Wipe existing data (order matters; line items cascade with parents).
  await prisma.lineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('ergon-demo-2026', 12);
  const owner = await prisma.user.create({
    data: {
      email: 'alex@ergonstudio.design',
      password: passwordHash,
      name: 'Alex Rivera',
      studioName: 'Ergon Design Studio',
    },
  });
  console.log(`  user: ${owner.email}`);

  // ── Clients ───────────────────────────────────────────────────────────────
  const sarah = await prisma.client.create({
    data: {
      userId: owner.id,
      name: 'Sarah Chen',
      company: 'Apex Digital Labs',
      email: 'sarah@apexdigital.io',
      phone: '+1 (415) 555-0192',
      notes: 'Long-term fintech client. Net-30 payment terms, very responsive.',
      status: 'ACTIVE',
      createdAt: daysAgo(210),
    },
  });
  const marcus = await prisma.client.create({
    data: {
      userId: owner.id,
      name: 'Marcus Vance',
      company: 'Vanguard Retail Co',
      email: 'm.vance@vanguardretail.com',
      phone: '+1 (212) 555-0144',
      status: 'ACTIVE',
      createdAt: daysAgo(190),
    },
  });
  const elena = await prisma.client.create({
    data: {
      userId: owner.id,
      name: 'Elena Rostova',
      company: 'Aetheria Health',
      email: 'elena@aetheriahealth.com',
      phone: '+1 (650) 555-0188',
      status: 'ACTIVE',
      createdAt: daysAgo(150),
    },
  });
  const david = await prisma.client.create({
    data: {
      userId: owner.id,
      name: 'David Kim',
      company: 'Kinetix AI',
      email: 'david@kinetixai.tech',
      status: 'LEAD',
      createdAt: daysAgo(20),
    },
  });
  const julian = await prisma.client.create({
    data: {
      userId: owner.id,
      name: 'Julian Croft',
      company: 'Solstice Media',
      email: 'jcroft@solsticemedia.net',
      status: 'PAST',
      createdAt: daysAgo(400),
    },
  });
  console.log('  clients: 5');

  // ── Projects ──────────────────────────────────────────────────────────────
  const prjFintech = await prisma.project.create({
    data: {
      clientId: sarah.id,
      title: 'Fintech Mobile App Redesign',
      status: 'IN_PROGRESS',
      quotedAmount: 9500,
      hoursLogged: 46.5,
      notes: 'Phase 2: onboarding, transaction flow, dark mode tokenization.',
      startDate: daysAgo(50),
      deadline: daysAhead(25),
      createdAt: daysAgo(55),
    },
  });
  const prjEcom = await prisma.project.create({
    data: {
      clientId: marcus.id,
      title: 'E-commerce Component Library',
      status: 'DELIVERED',
      quotedAmount: 6400,
      hoursLogged: 38,
      notes: 'Figma tokens + React Tailwind component documentation.',
      startDate: daysAgo(70),
      deadline: daysAgo(12),
      createdAt: daysAgo(75),
    },
  });
  const prjHealth = await prisma.project.create({
    data: {
      clientId: elena.id,
      title: 'Aetheria Design System & iOS App',
      status: 'REVISIONS',
      quotedAmount: 8800,
      hoursLogged: 52,
      notes: 'Client reviewing revised clinician telemetry views.',
      startDate: daysAgo(35),
      deadline: daysAhead(12),
      createdAt: daysAgo(40),
    },
  });
  const prjBrand = await prisma.project.create({
    data: {
      clientId: david.id,
      title: 'AI Platform Brand Identity & Website',
      status: 'QUOTE_SENT',
      quotedAmount: 11200,
      hoursLogged: 0,
      notes: 'Quote sent two weeks ago. Awaiting founder approval.',
      startDate: daysAhead(10),
      deadline: daysAhead(70),
      createdAt: daysAgo(16),
    },
  });
  const prjWorkshop = await prisma.project.create({
    data: {
      clientId: david.id,
      title: 'Studio Discovery Workshop',
      status: 'LEAD',
      quotedAmount: 2500,
      createdAt: daysAgo(6),
    },
  });
  const prjLookbook = await prisma.project.create({
    data: {
      clientId: marcus.id,
      title: 'Spring Lookbook & Editorial Site',
      status: 'PAID',
      quotedAmount: 5200,
      hoursLogged: 24,
      startDate: daysAgo(170),
      deadline: daysAgo(125),
      createdAt: daysAgo(175),
    },
  });
  const prjMagazine = await prisma.project.create({
    data: {
      clientId: julian.id,
      title: 'Annual Magazine Redesign',
      status: 'DELIVERED',
      quotedAmount: 1800,
      hoursLogged: 18,
      startDate: daysAgo(120),
      deadline: daysAgo(60),
      createdAt: daysAgo(125),
    },
  });
  console.log('  projects: 7');

  // ── Quotes (totals always via computeTotals — same math as production) ────
  const year = new Date().getUTCFullYear();

  async function createQuote({ project, number, items, taxRate, status, notes, validUntilDays, createdDaysAgo }) {
    const totals = computeTotals(items, taxRate);
    return prisma.quote.create({
      data: {
        projectId: project.id,
        clientId: project.clientId,
        quoteNumber: `QUO-${year}-${String(number).padStart(3, '0')}`,
        taxRate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        status,
        notes,
        validUntil: validUntilDays != null ? daysAhead(validUntilDays) : null,
        createdAt: daysAgo(createdDaysAgo),
        lineItems: {
          create: items.map((li, i) => ({
            description: li.description,
            quantity: li.quantity ?? 1,
            unitPrice: li.unitPrice,
            position: i,
          })),
        },
      },
    });
  }

  const quo1 = await createQuote({
    project: prjFintech,
    number: 1,
    items: [
      { description: 'Fintech App Core Wireframes & User Journey', unitPrice: 3500 },
      { description: 'Hi-Fi UI Design & Design Token Export', unitPrice: 6000 },
    ],
    taxRate: 0.08,
    status: 'APPROVED',
    notes: 'Split into milestone invoices.',
    createdDaysAgo: 54,
  });

  const quo2 = await createQuote({
    project: prjHealth,
    number: 2,
    items: [
      { description: 'iOS Patient Dashboard UI Screens (14 views)', unitPrice: 5200 },
      { description: 'Clinician Telemetry Web Portal Design', unitPrice: 3600 },
    ],
    taxRate: 0.08,
    status: 'APPROVED',
    notes: 'Approved by Elena Rostova.',
    createdDaysAgo: 39,
  });

  const quo3 = await createQuote({
    project: prjBrand,
    number: 3,
    items: [
      { description: 'Brand Strategy, Logo & Visual Identity System', unitPrice: 4500 },
      { description: 'High-Converting Web Design (Figma + Prototypes)', unitPrice: 4800 },
      { description: '3D Asset Art Direction & Icon Pack', unitPrice: 1900 },
    ],
    taxRate: 0.08,
    status: 'SENT',
    notes: 'Valid for 30 days. 50% deposit required upon contract initiation.',
    validUntilDays: 14,
    createdDaysAgo: 15,
  });

  const quo4 = await createQuote({
    project: prjEcom,
    number: 4,
    items: [
      { description: 'Design System Figma Component Library', unitPrice: 4000 },
      { description: 'Interactive Storybook Tailwind Reference Specs', unitPrice: 2400 },
    ],
    taxRate: 0,
    status: 'APPROVED',
    notes: 'Tax exempt under B2B professional services agreement.',
    createdDaysAgo: 74,
  });

  const quo5 = await createQuote({
    project: prjWorkshop,
    number: 5,
    items: [{ description: 'Strategy kickoff session & discovery roadmap', quantity: 2, unitPrice: 1250 }],
    taxRate: 0.18,
    status: 'DRAFT',
    notes: 'GST at standard 18% rate pending confirmation of place of supply.',
    createdDaysAgo: 5,
  });
  console.log('  quotes: 5');

  // ── Invoices ──────────────────────────────────────────────────────────────
  async function invoiceFromQuote({ quote, project, number, status, amountPaid, paidDaysAgo, dueInDays, issueDaysAgo, notes }) {
    // Line items are DUPLICATED onto the invoice (same rule as conversion API).
    const items = await prisma.lineItem.findMany({ where: { quoteId: quote.id }, orderBy: { position: 'asc' } });
    return prisma.invoice.create({
      data: {
        projectId: project.id,
        quoteId: quote.id,
        clientId: quote.clientId,
        invoiceNumber: `INV-${year}-${String(number).padStart(3, '0')}`,
        issueDate: daysAgo(issueDaysAgo),
        dueDate: dueInDays >= 0 ? daysAhead(dueInDays) : daysAgo(-dueInDays),
        subtotal: quote.subtotal,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        total: quote.total,
        amountPaid,
        status,
        paidDate: status === 'PAID' ? daysAgo(paidDaysAgo) : null,
        notes,
        createdAt: daysAgo(issueDaysAgo),
        updatedAt: status === 'PAID' ? daysAgo(paidDaysAgo) : daysAgo(Math.max(issueDaysAgo - 8, 0)),
        lineItems: {
          create: items.map((li, i) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            position: i,
          })),
        },
      },
    });
  }

  // 1) Fintech — PARTIAL: paid 4000 of 10260, due soon
  await invoiceFromQuote({
    quote: quo1,
    project: prjFintech,
    number: 1,
    status: 'PARTIAL',
    amountPaid: 4000,
    paidDaysAgo: 30,
    dueInDays: 14,
    issueDaysAgo: 45,
    notes: 'First installment received. Remaining balance due Net-14.',
  });

  // 2) Aetheria — UNPAID, future due date
  await invoiceFromQuote({
    quote: quo2,
    project: prjHealth,
    number: 2,
    status: 'UNPAID',
    amountPaid: 0,
    dueInDays: 25,
    issueDaysAgo: 38,
    notes: 'Net-30. Direct bank transfer instructions attached.',
  });

  // 3) E-commerce — PAID in full
  await invoiceFromQuote({
    quote: quo4,
    project: prjEcom,
    number: 3,
    status: 'PAID',
    amountPaid: Number(quo4.total),
    paidDaysAgo: 10,
    dueInDays: -20,
    issueDaysAgo: 50,
    notes: 'Paid in full via bank transfer.',
  });

  // 4) Lookbook — PAID (older, for trend history)
  const lookbookTotals = computeTotals(
    [{ description: 'Spring Lookbook Art Direction & Editorial Layout', quantity: 1, unitPrice: 5200 }],
    0
  );
  await prisma.invoice.create({
    data: {
      projectId: prjLookbook.id,
      clientId: marcus.id,
      invoiceNumber: `INV-${year}-004`,
      issueDate: daysAgo(140),
      dueDate: daysAgo(110),
      subtotal: lookbookTotals.subtotal,
      taxRate: 0,
      taxAmount: 0,
      total: lookbookTotals.total,
      amountPaid: lookbookTotals.total,
      status: 'PAID',
      paidDate: daysAgo(118),
      notes: 'Completed spring retainer.',
      createdAt: daysAgo(140),
      updatedAt: daysAgo(118),
      lineItems: {
        create: [{ description: 'Spring Lookbook Art Direction & Editorial Layout', quantity: 1, unitPrice: 5200 }],
      },
    },
  });

  // 5) Magazine (ad-hoc, no source quote) — OVERDUE: past dueDate, nothing paid
  const magTotals = computeTotals(
    [{ description: 'Editorial Print Preflight & Press Proofing', quantity: 1, unitPrice: 1800 }],
    0
  );
  await prisma.invoice.create({
    data: {
      projectId: prjMagazine.id,
      clientId: julian.id,
      invoiceNumber: `INV-${year}-005`,
      issueDate: daysAgo(75),
      dueDate: daysAgo(45),
      subtotal: magTotals.subtotal,
      taxRate: 0,
      taxAmount: 0,
      total: magTotals.total,
      amountPaid: 0,
      status: 'UNPAID',
      notes: 'Late fee notice sent. Follow up with accounting.',
      createdAt: daysAgo(75),
      updatedAt: daysAgo(30),
      lineItems: {
        create: [{ description: 'Editorial Print Preflight & Press Proofing', quantity: 1, unitPrice: 1800 }],
      },
    },
  });
  console.log('  invoices: 5 (PAID ×2, PARTIAL ×1, UNPAID ×1, OVERDUE ×1)');
  console.log('Seed complete. Demo login: alex@ergonstudio.design / ergon-demo-2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
