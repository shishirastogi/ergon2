import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  Layers,
  Plus,
  Settings,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useStudio } from '../../context/StudioContext';
import { BrandLogo } from '../common/BrandLogo';
import { StudioModal } from '../common/StudioModal';
import { DateRangeSelector } from './DateRangeSelector';

export const Navbar: React.FC = () => {
  const { user, isGuest, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { studios, activeStudio, activeStudioId, switchStudio, isMaxStudios } = useStudio();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Overview', path: '/' },
    { label: 'Clients', path: '/clients' },
    { label: 'Projects', path: '/projects' },
    { label: 'Quotes', path: '/quotes' },
    { label: 'Invoices', path: '/invoices' },
  ];

  const handleSelectStudio = async (id: string) => {
    if (id === activeStudioId) return;
    await switchStudio(id);
  };

  const handleOpenCreateStudio = () => {
    setIsMenuOpen(false);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditStudio = () => {
    setIsMenuOpen(false);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const activeStudioName = activeStudio?.name || user?.studioName || 'Ergon Studio';
  const studioInitial = (activeStudioName.trim()[0] || 'E').toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-page/55 backdrop-blur-2xl -webkit-backdrop-blur-xl transition-all border-b border-border-subtle/70 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <NavLink to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              {/* Clean logo */}
              <BrandLogo size="sm" className="sm:hidden group-hover:scale-105 transition-transform" />
              <BrandLogo size="md" className="hidden sm:block group-hover:scale-105 transition-transform" />
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-text-primary">
                  ergon
                </span>
                {isGuest && (
                  <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                    demo
                  </span>
                )}
              </div>
            </NavLink>

            {/* Center Navigation for Desktop with Glassmorphism */}
            <nav className="hidden md:flex items-center gap-1 bg-card/75 backdrop-blur-md p-1 rounded-full shadow-xs border border-border-subtle/80">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-150 ${
                      isActive
                        ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-card-alt/60'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: Date Range Selector, Theme Switcher, User & Studio Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Functional Date Range Filter */}
            <div className="hidden sm:flex">
              <DateRangeSelector />
            </div>

            {/* Light / Dark Mode Toggle Pill Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-full bg-card/75 backdrop-blur-md hover:bg-card border border-border-subtle/80 text-text-secondary hover:text-text-primary shadow-xs transition-all cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-600" />
              )}
            </button>

            {/* User Profile & Studio Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-2 pl-1.5 pr-2.5 sm:pl-2 sm:pr-3 py-1 sm:py-1.5 rounded-full bg-card/75 backdrop-blur-md hover:bg-card shadow-xs border border-border-subtle/80 transition-all text-xs font-medium text-text-primary cursor-pointer ${
                  isMenuOpen ? 'ring-2 ring-accent-blue/30 border-accent-blue' : ''
                }`}
                title="Account & Studio Workspace Menu"
              >
                {/* Active Studio Initial or User Avatar */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-accent-blue to-accent-green text-white flex items-center justify-center text-[10px] sm:text-xs font-black shadow-xs shrink-0">
                  {studioInitial}
                </div>

                <div className="hidden sm:flex flex-col text-left leading-tight max-w-[120px] lg:max-w-[160px]">
                  <span className="font-bold text-text-primary truncate text-xs">
                    {activeStudioName}
                  </span>
                  <span className="text-[10px] text-text-secondary truncate">
                    {user?.name || 'Studio Owner'}
                  </span>
                </div>

                <ChevronDown
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-secondary transition-transform duration-200 ${
                    isMenuOpen ? 'rotate-180 text-text-primary' : ''
                  }`}
                />
              </button>

              {/* Comprehensive User & Studio Switcher Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-card/95 backdrop-blur-2xl rounded-card-sm shadow-ergon-float border border-border-subtle p-2.5 z-50 animate-in fade-in slide-in-from-top-2">
                  {/* Account Header */}
                  <div className="px-2.5 py-2 border-b border-border-subtle mb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-text-primary">
                        {user?.name || 'Studio Owner'}
                      </p>
                      {isGuest && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold">
                          Demo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary truncate mt-0.5">
                      {user?.email || 'designer@ergon.studio'}
                    </p>
                  </div>

                  {/* Studio Switcher Section */}
                  <div className="mb-2">
                    <div className="px-2.5 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-text-secondary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                          Studio Workspaces ({studios.length}/5)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-accent-blue">
                        Max 5
                      </span>
                    </div>

                    {/* Studio Items List */}
                    <div className="py-1 max-h-48 overflow-y-auto space-y-1">
                      {studios.map((studio) => {
                        const isSelected = studio.id === activeStudioId;
                        const sInitial = (studio.name.trim()[0] || 'S').toUpperCase();

                        return (
                          <button
                            key={studio.id}
                            type="button"
                            onClick={() => handleSelectStudio(studio.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer group ${
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
                              {isSelected && <Check className="w-3.5 h-3.5 text-accent-green shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Studio Management Actions */}
                    <div className="pt-1.5 mt-1 border-t border-border-subtle space-y-0.5">
                      {/* Edit Active Studio Settings */}
                      <button
                        type="button"
                        onClick={handleOpenEditStudio}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-alt rounded-lg transition-colors text-left cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-text-secondary" />
                        <span>Studio Settings</span>
                      </button>

                      {/* Create New Studio Button */}
                      <button
                        type="button"
                        onClick={handleOpenCreateStudio}
                        disabled={isMaxStudios}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors text-left ${
                          isMaxStudios
                            ? 'text-text-secondary opacity-50 cursor-not-allowed'
                            : 'text-accent-blue hover:bg-accent-blue/10 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create New Studio</span>
                        </div>
                        <span className="text-[10px] font-mono text-text-secondary">
                          {studios.length}/5
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Appearance Switcher */}
                  <div className="pt-1 border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-card-alt rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                        <span>Appearance</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-text-secondary">
                        {isDark ? 'Dark' : 'Light'}
                      </span>
                    </button>
                  </div>

                  {/* Sign Out */}
                  <div className="pt-1 border-t border-border-subtle">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-status-overdue hover:bg-rose-500/10 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Studio Modal for Creating / Editing Studios */}
      <StudioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialStudio={modalMode === 'edit' ? activeStudio : null}
      />
    </>
  );
};
