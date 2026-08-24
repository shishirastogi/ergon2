import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

interface DatePreset {
  id: string;
  label: string;
  range: string;
  comparedTo: string;
}

const PRESETS: DatePreset[] = [
  {
    id: 'ytd',
    label: 'Year to Date (YTD)',
    range: 'Jan 01 – Jul 31',
    comparedTo: 'Aug 01 – Dec 31',
  },
  {
    id: '30d',
    label: 'Last 30 Days',
    range: 'Jul 24 – Aug 23',
    comparedTo: 'Jun 24 – Jul 23',
  },
  {
    id: 'q3',
    label: 'This Quarter (Q3)',
    range: 'Jul 01 – Sep 30',
    comparedTo: 'Apr 01 – Jun 30',
  },
  {
    id: 'q2',
    label: 'Previous Quarter (Q2)',
    range: 'Apr 01 – Jun 30',
    comparedTo: 'Jan 01 – Mar 31',
  },
  {
    id: 'full_year',
    label: 'Full Year 2026',
    range: 'Jan 01 – Dec 31',
    comparedTo: 'Prior Year 2025',
  },
];

export const DateRangeSelector: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(PRESETS[0]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Date Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-text-secondary bg-card/75 backdrop-blur-md hover:bg-card px-3 py-1.5 rounded-full shadow-xs border border-border-subtle/80 transition-all cursor-pointer"
        title="Select Date Range Filter"
      >
        <Calendar className="w-3.5 h-3.5 text-text-secondary shrink-0" />
        <span className="font-semibold text-text-primary">{selectedPreset.range}</span>
        <span className="hidden xl:inline text-border-subtle mx-0.5">|</span>
        <span className="hidden xl:inline text-text-secondary">vs</span>
        <span className="hidden xl:inline font-medium text-text-primary">{selectedPreset.comparedTo}</span>
        <ChevronDown
          className={`w-3 h-3 text-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-text-primary' : ''
          }`}
        />
      </button>

      {/* Date Presets Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card/90 backdrop-blur-2xl rounded-card-sm shadow-ergon-float border border-border-subtle p-2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-2.5 py-1.5 border-b border-border-subtle mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Date Filter Period
            </span>
          </div>

          <div className="space-y-0.5">
            {PRESETS.map((preset) => {
              const isSelected = preset.id === selectedPreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 font-bold'
                      : 'hover:bg-card-alt text-text-primary'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold">{preset.label}</p>
                    <p
                      className={`text-[10px] ${
                        isSelected ? 'text-white/75' : 'text-text-secondary'
                      }`}
                    >
                      {preset.range}
                    </p>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent-green shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
