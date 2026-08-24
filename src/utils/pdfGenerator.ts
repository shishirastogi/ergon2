import jsPDF from 'jspdf';
import { Invoice, Quote, Studio } from '../types';
import { formatCurrency, formatDate } from './formatters';

/**
 * Generates a clean, professional, high-resolution PDF document for an Invoice.
 */
export function generateInvoicePdf(invoice: Invoice, studio?: Studio): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = invoice.currency || invoice.client?.currency || 'USD';
  const studioName = studio?.name || invoice.studio?.name || 'Studio Workspace';
  const studioTagline = studio?.tagline || invoice.studio?.tagline || '';
  const rawEmail = studio?.email || invoice.studio?.email || '';
  const studioEmail = rawEmail && !rawEmail.includes('@ergon.') ? rawEmail : '';
  const rawWebsite = studio?.website || invoice.studio?.website || '';
  const studioWebsite = rawWebsite && !rawWebsite.includes('ergon.') ? rawWebsite : '';
  const studioInitial = (studioName.trim()[0] || 'S').toUpperCase();

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // Colors
  const primaryColor: [number, number, number] = [17, 24, 39]; // Gray-900 / Dark
  const secondaryColor: [number, number, number] = [107, 114, 128]; // Gray-500
  const lightBg: [number, number, number] = [249, 250, 251]; // Gray-50
  const borderColor: [number, number, number] = [229, 231, 235]; // Gray-200

  let currentY = 18;

  // 1. Header Section: Studio Branding & Invoice Title
  doc.setFillColor(...primaryColor);
  doc.rect(margin, currentY, 8, 8, 'F'); // Studio brand logo square
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(studioInitial, margin + 2.5, currentY + 5.8);

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(studioName, margin + 11, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  if (studioTagline) {
    doc.text(studioTagline, margin, currentY + 13);
  }
  const contactLine = [studioEmail, studioWebsite].filter(Boolean).join(' • ');
  if (contactLine) {
    doc.text(contactLine, margin, currentY + (studioTagline ? 17.5 : 13));
  }

  // Right-aligned Invoice Title & Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('INVOICE', pageWidth - margin, currentY + 5, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(invoice.invoiceNumber || 'INV-DRAFT', pageWidth - margin, currentY + 11, { align: 'right' });

  // Status Badge
  const status = invoice.status || 'UNPAID';
  let statusBg: [number, number, number] = [243, 244, 246];
  let statusText: [number, number, number] = [75, 85, 99];
  if (status === 'PAID') {
    statusBg = [209, 250, 229]; // Emerald 100
    statusText = [6, 95, 70]; // Emerald 800
  } else if (status === 'OVERDUE') {
    statusBg = [254, 226, 226]; // Rose 100
    statusText = [153, 27, 27]; // Rose 800
  } else if (status === 'PARTIAL') {
    statusBg = [254, 243, 199]; // Amber 100
    statusText = [146, 64, 14]; // Amber 800
  }

  const badgeWidth = 24;
  const badgeHeight = 5.5;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = currentY + 14;

  doc.setFillColor(...statusBg);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...statusText);
  doc.text(status, badgeX + badgeWidth / 2, badgeY + 3.8, { align: 'center' });

  currentY += 26;

  // Horizontal divider
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // 2. Metadata Grid: Billed To & Project Details
  const colWidth = contentWidth / 2;

  // Left Column: Client Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('BILLED TO', margin, currentY);

  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(invoice.client?.name || 'Studio Client', margin, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  let clientOffset = 9;
  if (invoice.client?.company) {
    doc.text(invoice.client.company, margin, currentY + clientOffset);
    clientOffset += 4;
  }
  if (invoice.client?.email) {
    doc.text(invoice.client.email, margin, currentY + clientOffset);
    clientOffset += 4;
  }
  if (invoice.client?.phone) {
    doc.text(invoice.client.phone, margin, currentY + clientOffset);
  }

  // Right Column: Invoice Dates & Project Context
  const rightX = margin + colWidth;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('INVOICE DATES & PROJECT', rightX, currentY);

  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Issue Date:', rightX, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(formatDate(invoice.issueDate), rightX + 25, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Due Date:', rightX, currentY + 9.5);
  doc.setFont('helvetica', 'bold');
  const overdueColor: [number, number, number] = [225, 29, 72];
  doc.setTextColor(...(status === 'OVERDUE' ? overdueColor : primaryColor));
  doc.text(formatDate(invoice.dueDate), rightX + 25, currentY + 9.5);

  if (invoice.project?.title) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text('Project:', rightX, currentY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(invoice.project.title, rightX + 25, currentY + 14);
  }

  currentY += 24;

  // 3. Line Items Table
  // Table Header
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
  doc.setDrawColor(...borderColor);
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('DESCRIPTION', margin + 3, currentY + 4.8);
  doc.text('QTY', margin + 115, currentY + 4.8, { align: 'center' });
  doc.text(`UNIT RATE (${currency})`, margin + 145, currentY + 4.8, { align: 'right' });
  doc.text(`AMOUNT (${currency})`, pageWidth - margin - 3, currentY + 4.8, { align: 'right' });

  currentY += 7;

  // Table Body Rows
  const items = invoice.lineItems || [];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  items.forEach((item, index) => {
    const rowHeight = 7.5;
    const isEven = index % 2 === 0;

    if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(...lightBg);
    }
    doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    doc.setDrawColor(...borderColor);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    const itemTotal = (Number(item.quantity) || 1) * (Number(item.unitRate) || 0);

    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'medium');
    doc.text(item.description || 'Deliverable', margin + 3, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text(String(item.quantity || 1), margin + 115, currentY + 5, { align: 'center' });

    doc.setTextColor(...primaryColor);
    doc.text(formatCurrency(item.unitRate || 0, currency), margin + 145, currentY + 5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(itemTotal, currency), pageWidth - margin - 3, currentY + 5, { align: 'right' });

    currentY += rowHeight;
  });

  currentY += 6;

  // 4. Financial Summary & Notes
  const summaryWidth = 72;
  const summaryX = pageWidth - margin - summaryWidth;
  const notesWidth = contentWidth - summaryWidth - 8;

  // Left side: Payment terms & Notes
  if (invoice.notes) {
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, currentY, notesWidth, 26, 2, 2, 'F');
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, currentY, notesWidth, 26, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...secondaryColor);
    doc.text('PAYMENT INSTRUCTIONS & TERMS', margin + 3.5, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    const splitNotes = doc.splitTextToSize(invoice.notes, notesWidth - 7);
    doc.text(splitNotes, margin + 3.5, currentY + 9);
  }

  // Right side: Totals Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(summaryX, currentY, summaryWidth, 38, 2, 2, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(summaryX, currentY, summaryWidth, 38, 2, 2, 'S');

  let summaryY = currentY + 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Subtotal:', summaryX + 4, summaryY);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(invoice.subtotal || 0, currency), pageWidth - margin - 4, summaryY, { align: 'right' });

  summaryY += 5.5;
  const taxPct = ((invoice.taxRate || 0) * 100).toFixed(0);
  doc.setTextColor(...secondaryColor);
  doc.text(`Tax (${taxPct}%):`, summaryX + 4, summaryY);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(invoice.taxAmount || 0, currency), pageWidth - margin - 4, summaryY, { align: 'right' });

  summaryY += 4.5;
  doc.setDrawColor(...borderColor);
  doc.line(summaryX + 4, summaryY, pageWidth - margin - 4, summaryY);

  summaryY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('Total Invoiced:', summaryX + 4, summaryY);
  doc.text(formatCurrency(invoice.total || 0, currency), pageWidth - margin - 4, summaryY, { align: 'right' });

  if ((invoice.amountPaid || 0) > 0) {
    summaryY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text('Amount Paid:', summaryX + 4, summaryY);
    doc.text(formatCurrency(invoice.amountPaid || 0, currency), pageWidth - margin - 4, summaryY, { align: 'right' });

    summaryY += 4.5;
    const remaining = Math.max(0, (invoice.total || 0) - (invoice.amountPaid || 0));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6); // Amber-600
    doc.text('Balance Due:', summaryX + 4, summaryY);
    doc.text(formatCurrency(remaining, currency), pageWidth - margin - 4, summaryY, { align: 'right' });
  }

  // 5. Footer
  const footerY = 282;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('made by ergon.shishirexe.com', margin, footerY);
  doc.text(`Generated on ${formatDate(new Date().toISOString())}`, pageWidth - margin, footerY, { align: 'right' });

  return doc.output('blob');
}

/**
 * Generates a clean, professional, high-resolution PDF document for a Quote / Proposal.
 */
export function generateQuotePdf(quote: Quote, studio?: Studio): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = quote.currency || quote.client?.currency || 'USD';
  const studioName = studio?.name || quote.studio?.name || 'Studio Workspace';
  const studioTagline = studio?.tagline || quote.studio?.tagline || '';
  const rawEmail = studio?.email || quote.studio?.email || '';
  const studioEmail = rawEmail && !rawEmail.includes('@ergon.') ? rawEmail : '';
  const rawWebsite = studio?.website || quote.studio?.website || '';
  const studioWebsite = rawWebsite && !rawWebsite.includes('ergon.') ? rawWebsite : '';
  const studioInitial = (studioName.trim()[0] || 'S').toUpperCase();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor: [number, number, number] = [17, 24, 39];
  const secondaryColor: [number, number, number] = [107, 114, 128];
  const lightBg: [number, number, number] = [249, 250, 251];
  const borderColor: [number, number, number] = [229, 231, 235];

  let currentY = 18;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(margin, currentY, 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(studioInitial, margin + 2.5, currentY + 5.8);

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(studioName, margin + 11, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  if (studioTagline) {
    doc.text(studioTagline, margin, currentY + 13);
  }
  const contactLine = [studioEmail, studioWebsite].filter(Boolean).join(' • ');
  if (contactLine) {
    doc.text(contactLine, margin, currentY + (studioTagline ? 17.5 : 13));
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('PROPOSAL', pageWidth - margin, currentY + 5, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(quote.quoteNumber || 'QTE-DRAFT', pageWidth - margin, currentY + 11, { align: 'right' });

  currentY += 26;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // Metadata
  const colWidth = contentWidth / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('PROPOSAL PREPARED FOR', margin, currentY);

  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(quote.client?.name || 'Prospective Client', margin, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  if (quote.client?.company) {
    doc.text(quote.client.company, margin, currentY + 9);
  }

  const rightX = margin + colWidth;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('PROPOSAL DETAILS', rightX, currentY);

  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Valid Until:', rightX, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(formatDate(quote.validUntil), rightX + 25, currentY + 5);

  if (quote.project?.title) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text('Project:', rightX, currentY + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(quote.project.title, rightX + 25, currentY + 9.5);
  }

  currentY += 20;

  // Items table
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
  doc.setDrawColor(...borderColor);
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('SCOPE DELIVERABLE', margin + 3, currentY + 4.8);
  doc.text('QTY', margin + 115, currentY + 4.8, { align: 'center' });
  doc.text(`RATE (${currency})`, margin + 145, currentY + 4.8, { align: 'right' });
  doc.text(`TOTAL (${currency})`, pageWidth - margin - 3, currentY + 4.8, { align: 'right' });

  currentY += 7;

  (quote.lineItems || []).forEach((item, index) => {
    const rowHeight = 7.5;
    if (index % 2 === 1) {
      doc.setFillColor(...lightBg);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(...borderColor);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    const itemTotal = (Number(item.quantity) || 1) * (Number(item.unitRate) || 0);

    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text(item.description || 'Deliverable', margin + 3, currentY + 5);

    doc.setTextColor(...secondaryColor);
    doc.text(String(item.quantity || 1), margin + 115, currentY + 5, { align: 'center' });

    doc.setTextColor(...primaryColor);
    doc.text(formatCurrency(item.unitRate || 0, currency), margin + 145, currentY + 5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(itemTotal, currency), pageWidth - margin - 3, currentY + 5, { align: 'right' });

    currentY += rowHeight;
  });

  currentY += 6;

  // Summary
  const summaryWidth = 72;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.setFillColor(...lightBg);
  doc.roundedRect(summaryX, currentY, summaryWidth, 26, 2, 2, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(summaryX, currentY, summaryWidth, 26, 2, 2, 'S');

  let summaryY = currentY + 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Subtotal:', summaryX + 4, summaryY);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(quote.subtotal || 0, currency), pageWidth - margin - 4, summaryY, { align: 'right' });

  summaryY += 5.5;
  const taxPct = ((quote.taxRate || 0) * 100).toFixed(0);
  doc.setTextColor(...secondaryColor);
  doc.text(`Tax (${taxPct}%):`, summaryX + 4, summaryY);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(quote.taxAmount || 0, currency), pageWidth - margin - 4, summaryY, { align: 'right' });

  summaryY += 4.5;
  doc.setDrawColor(...borderColor);
  doc.line(summaryX + 4, summaryY, pageWidth - margin - 4, summaryY);

  summaryY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('Estimated Total:', summaryX + 4, summaryY);
  doc.text(formatCurrency(quote.total || 0, currency), pageWidth - margin - 4, summaryY, { align: 'right' });

  // Footer
  const footerY = 282;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('made by ergon.shishirexe.com', margin, footerY);
  doc.text(`Generated on ${formatDate(new Date().toISOString())}`, pageWidth - margin, footerY, { align: 'right' });

  return doc.output('blob');
}
