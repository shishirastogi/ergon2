import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { StudioModal } from './StudioModal';
import {
  ChevronDown,
  Check,
  Plus,
  Settings,
  Layers,
} from 'lucide-react';

export const StudioSwitcher: React.FC = () => {
  const { studios, activeStudio, activeStudioId, switchStudio, isMaxStudios } = useStudio();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStudio = async (id: string) => {
    if (id === activeStudioId) {
      setIsOpen(false);
      return;
    }
    await switchStudio(id);
    setIsOpen(false);
  };

  const handleOpenCreate = () => {
    setIsOpen(false);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = () => {
    setIsOpen(false);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const currentName = activeStudio?.name || 'Ergon Studio';
  const initial = (currentName.trim()[0] || 'E').toUpperCase();

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Switcher Pill Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-card/75 backdrop-blur-md hover:bg-card border border-border-subtle/80 shadow-xs transition-all text-xs font-medium text-text-primary cursor-pointer max-w-[125px] xs:max-w-[160px] sm:max-w-[220px]"
          title="Switch Studio Workspace"
        >
          {/* Studio Initial Badge */}
          <div className="w-5 h-5 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs">
            {initial}
          </div>

          <span className="font-bold text-text-primary truncate text-left">
            {currentName}
          </span>

          <span className="hidden sm:inline-flex text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-card-alt text-text-secondary border border-border-subtle shrink-0">
            {studios.length}/5
          </span>

          <ChevronDown className="w-3.5 h-3.5 text-text-secondary shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 bg-card rounded-card-sm shadow-ergon-float border border-border-subtle p-2 z-50 animate-in fade-in slide-in-from-top-2">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-text-secondary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Studios ({studios.length}/5)
                </span>
              </div>
              <span className="text-[10px] font-semibold text-accent-blue">
                Max 5
              </span>
            </div>

            {/* Studio List */}
            <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
              {studios.map((studio) => {
                const isSelected = studio.id === activeStudioId;
                const sInitial = (studio.name.trim()[0] || 'S').toUpperCase();

                return (
                  <button
                    key={studio.id}
                    type="button"
                    onClick={() => handleSelectStudio(studio.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer group ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white font-bold shadow-xs'
                        : 'text-text-primary hover:bg-card-alt font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-card-alt text-text-primary border border-border-subtle group-hover:border-accent-blue'
                        }`}
                      >
                        {sInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs leading-tight">
                          {studio.name}
                        </p>
                        {studio.tagline && (
                          <p
                            className={`truncate text-[10px] ${
                              isSelected ? 'text-white/70' : 'text-text-secondary'
                            }`}
                          >
                            {studio.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {studio.currency && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                            isSelected
                              ? 'bg-white/10 text-white border-white/20'
                              : 'bg-card-alt text-text-secondary border-border-subtle'
                          }`}
                        >
                          {studio.currency}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent-green" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Actions Divider */}
            <div className="pt-1.5 mt-1 border-t border-border-subtle space-y-0.5">
              {/* Studio Settings */}
              <button
                type="button"
                onClick={handleOpenEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-alt rounded-xl transition-colors text-left cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-text-secondary" />
                <span>Studio Settings</span>
              </button>

              {/* Add Studio Button */}
              <button
                type="button"
                onClick={handleOpenCreate}
                disabled={isMaxStudios}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-colors text-left ${
                  isMaxStudios
                    ? 'text-text-secondary opacity-50 cursor-not-allowed'
                    : 'text-accent-blue hover:bg-accent-blue/10 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Studio</span>
                </div>
                <span className="text-[10px] font-mono text-text-secondary">
                  {studios.length}/5
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Studio Modal */}
      <StudioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialStudio={modalMode === 'edit' ? activeStudio : null}
      />
    </>
  );
};
