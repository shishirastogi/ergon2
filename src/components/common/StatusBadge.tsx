import React from 'react';

export type AnyStatus =
  | 'PAID'
  | 'PARTIAL'
  | 'UNPAID'
  | 'OVERDUE'
  | 'DRAFT'
  | 'SENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'LEAD'
  | 'ACTIVE'
  | 'PAST'
  | 'QUOTE_SENT'
  | 'IN_PROGRESS'
  | 'REVISIONS'
  | 'DELIVERED';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  const norm = (status || '').toUpperCase();

  let bgClass = 'bg-card-alt border border-border-subtle';
  let textClass = 'text-text-secondary font-medium';
  let dotClass = 'bg-neutral-400';
  let label = status;

  switch (norm) {
    case 'PAID':
      bgClass = 'bg-emerald-500/15 dark:bg-emerald-950/40 border border-emerald-500/20';
      textClass = 'text-emerald-700 dark:text-emerald-400 font-semibold';
      dotClass = 'bg-emerald-500';
      label = 'Paid';
      break;
    case 'PARTIAL':
      bgClass = 'bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/20';
      textClass = 'text-amber-700 dark:text-amber-400 font-semibold';
      dotClass = 'bg-amber-500';
      label = 'Partial';
      break;
    case 'UNPAID':
      bgClass = 'bg-blue-500/15 dark:bg-blue-950/40 border border-blue-500/20';
      textClass = 'text-accent-blue font-semibold';
      dotClass = 'bg-accent-blue';
      label = 'Unpaid';
      break;
    case 'OVERDUE':
      bgClass = 'bg-rose-500/15 dark:bg-rose-950/40 border border-rose-500/20';
      textClass = 'text-rose-600 dark:text-rose-400 font-semibold';
      dotClass = 'bg-rose-500 animate-pulse';
      label = 'Overdue';
      break;
    case 'APPROVED':
      bgClass = 'bg-emerald-500/15 dark:bg-emerald-950/40 border border-emerald-500/20';
      textClass = 'text-emerald-700 dark:text-emerald-400 font-semibold';
      dotClass = 'bg-emerald-500';
      label = 'Approved';
      break;
    case 'SENT':
      bgClass = 'bg-blue-500/15 dark:bg-blue-950/40 border border-blue-500/20';
      textClass = 'text-accent-blue font-semibold';
      dotClass = 'bg-accent-blue';
      label = 'Sent';
      break;
    case 'DRAFT':
      bgClass = 'bg-card-alt border border-border-subtle';
      textClass = 'text-text-secondary font-medium';
      dotClass = 'bg-neutral-400 dark:bg-neutral-500';
      label = 'Draft';
      break;
    case 'REJECTED':
      bgClass = 'bg-rose-500/15 dark:bg-rose-950/40 border border-rose-500/20';
      textClass = 'text-rose-600 dark:text-rose-400 font-semibold';
      dotClass = 'bg-rose-500';
      label = 'Rejected';
      break;
    case 'ACTIVE':
      bgClass = 'bg-emerald-500/15 dark:bg-emerald-950/40 border border-emerald-500/20';
      textClass = 'text-emerald-700 dark:text-emerald-400 font-semibold';
      dotClass = 'bg-emerald-500';
      label = 'Active';
      break;
    case 'LEAD':
      bgClass = 'bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/20';
      textClass = 'text-amber-700 dark:text-amber-400 font-semibold';
      dotClass = 'bg-amber-500';
      label = 'Lead';
      break;
    case 'PAST':
      bgClass = 'bg-card-alt border border-border-subtle';
      textClass = 'text-text-secondary font-medium';
      dotClass = 'bg-neutral-400 dark:bg-neutral-500';
      label = 'Past';
      break;
    case 'QUOTE_SENT':
      bgClass = 'bg-blue-500/15 dark:bg-blue-950/40 border border-blue-500/20';
      textClass = 'text-accent-blue font-semibold';
      dotClass = 'bg-accent-blue';
      label = 'Quote Sent';
      break;
    case 'IN_PROGRESS':
      bgClass = 'bg-indigo-500/15 dark:bg-indigo-950/40 border border-indigo-500/20';
      textClass = 'text-indigo-700 dark:text-indigo-400 font-semibold';
      dotClass = 'bg-indigo-500';
      label = 'In Progress';
      break;
    case 'REVISIONS':
      bgClass = 'bg-purple-500/15 dark:bg-purple-950/40 border border-purple-500/20';
      textClass = 'text-purple-700 dark:text-purple-400 font-semibold';
      dotClass = 'bg-purple-500';
      label = 'Revisions';
      break;
    case 'DELIVERED':
      bgClass = 'bg-emerald-500/15 dark:bg-emerald-950/40 border border-emerald-500/20';
      textClass = 'text-emerald-700 dark:text-emerald-400 font-semibold';
      dotClass = 'bg-emerald-500';
      label = 'Delivered';
      break;
  }

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs gap-1.5',
    md: 'px-3.5 py-1 text-xs gap-2',
    lg: 'px-4 py-1.5 text-sm gap-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full transition-colors ${bgClass} ${textClass} ${sizeClasses} ${className}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />}
      <span>{label}</span>
    </span>
  );
};
