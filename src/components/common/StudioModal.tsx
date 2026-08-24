import React, { useState, useEffect } from 'react';
import { Studio, CurrencyCode } from '../../types';
import { useStudio } from '../../context/StudioContext';
import { SUPPORTED_CURRENCIES } from '../../context/CurrencyContext';
import { X, Building2, Globe, Mail, Sparkles, Trash2, AlertCircle, Loader2 } from 'lucide-react';

interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  initialStudio?: Studio | null;
}

export const StudioModal: React.FC<StudioModalProps> = ({
  isOpen,
  onClose,
  mode = 'create',
  initialStudio,
}) => {
  const { studios, isMaxStudios, createStudio, updateStudio, deleteStudio } = useStudio();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialStudio) {
        setName(initialStudio.name || '');
        setTagline(initialStudio.tagline || '');
        setEmail(initialStudio.email || '');
        setWebsite(initialStudio.website || '');
        setCurrency((initialStudio.currency as CurrencyCode) || 'USD');
      } else {
        setName('');
        setTagline('');
        setEmail('');
        setWebsite('');
        setCurrency('USD');
      }
      setError(null);
    }
  }, [isOpen, mode, initialStudio]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Studio name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (mode === 'edit' && initialStudio) {
        await updateStudio(initialStudio.id, {
          name,
          tagline,
          email,
          website,
          currency,
        });
      } else {
        if (isMaxStudios) {
          setError('Studio limit reached. Maximum of 5 studios allowed per account.');
          return;
        }
        await createStudio({
          name,
          tagline,
          email,
          website,
          currency,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save studio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialStudio) return;
    if (studios.length <= 1) {
      setError('Cannot delete your only studio.');
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete "${initialStudio.name}"? All invoices, clients, and projects under this studio will be deleted.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await deleteStudio(initialStudio.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete studio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card rounded-card shadow-ergon-modal border border-border-subtle overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary">
                {mode === 'edit' ? 'Studio Settings' : 'Create New Studio'}
              </h2>
              <p className="text-xs text-text-secondary">
                {mode === 'edit'
                  ? 'Update studio profile, branding, and billing details'
                  : `Add an independent workspace (${studios.length}/5 used)`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-card-alt transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Studio Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Studio Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Visuals, Studio Nordic, BrandLab"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border focus:border-accent-blue rounded-xl text-text-primary text-sm font-medium focus:outline-none transition-all shadow-xs"
            />
            <p className="text-[11px] text-text-secondary mt-1">
              This name will appear on all invoices, proposals, and PDFs created in this studio.
            </p>
          </div>

          {/* Tagline / Subtitle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Tagline / Subtitle
            </label>
            <div className="relative">
              <Sparkles className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. Freelance Design & Brand Engineering"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-input-bg border border-input-border focus:border-accent-blue rounded-xl text-text-primary text-sm font-medium focus:outline-none transition-all shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Studio Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Business Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  placeholder="contact@studio.design"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-input-bg border border-input-border focus:border-accent-blue rounded-xl text-text-primary text-sm font-medium focus:outline-none transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Website URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="https://studio.design"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-input-bg border border-input-border focus:border-accent-blue rounded-xl text-text-primary text-sm font-medium focus:outline-none transition-all shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Default Currency */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Default Studio Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border focus:border-accent-blue rounded-xl text-text-primary text-sm font-medium focus:outline-none transition-all shadow-xs"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} – {c.name} ({c.symbol})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-secondary mt-1">
              New clients and proposals will inherit this default currency.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
            {mode === 'edit' && studios.length > 1 ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Studio</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary rounded-xl hover:bg-card-alt transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-5 py-2.5 text-xs font-black text-white bg-neutral-900 dark:bg-white dark:text-neutral-950 rounded-xl shadow-sm hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{mode === 'edit' ? 'Save Changes' : 'Create Studio'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
