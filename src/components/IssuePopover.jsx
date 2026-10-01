import React, { useEffect, useRef } from 'react';
import { Check, X, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

const TYPE_CONFIG = {
  grammar: {
    label: 'Grammar',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    accentColor: 'rose'
  },
  spelling: {
    label: 'Spelling',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    accentColor: 'amber'
  },
  structure: {
    label: 'Sentence Structure',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    accentColor: 'purple'
  },
  style: {
    label: 'Style & Clarity',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    accentColor: 'sky'
  }
};

export default function IssuePopover({
  issue,
  onAccept,
  onIgnore,
  onClose,
  position
}) {
  const popoverRef = useRef(null);
  const acceptBtnRef = useRef(null);

  useEffect(() => {
    // Focus accept button for fast keyboard workflow
    if (acceptBtnRef.current) {
      acceptBtnRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey && (e.target.tagName !== 'BUTTON')) {
        e.preventDefault();
        onAccept(issue);
      }
    };

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Use mousedown with timeout to allow click on target span without immediate re-trigger
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [issue, onAccept, onClose]);

  if (!issue) return null;

  const config = TYPE_CONFIG[issue.type] || TYPE_CONFIG.grammar;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`${config.label} suggestion`}
      tabIndex={-1}
      style={{
        top: position?.top ? `${position.top}px` : undefined,
        left: position?.left ? `${position.left}px` : undefined,
      }}
      className={`z-50 w-84 sm:w-96 rounded-xl bg-white shadow-2xl border border-slate-200 p-4 transition-all duration-150 animate-in fade-in zoom-in-95 text-slate-800 ${
        position ? 'absolute' : 'relative my-2'
      }`}
    >
      {/* Header with Type & Close */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${config.badgeClass}`}>
            {config.label}
          </span>
          <span className="text-[11px] text-slate-400">Press Enter to accept</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close popover"
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Before and After Comparison */}
      <div className="my-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-rose-700 font-mono text-xs">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-rose-500">Original:</span>
          <del className="bg-rose-100/70 px-1.5 py-0.5 rounded line-through">{issue.original}</del>
        </div>
        <div className="flex items-center gap-2 text-emerald-700 font-mono text-xs font-semibold">
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-600">Suggestion:</span>
          <span className="bg-emerald-100 px-1.5 py-0.5 rounded">{issue.suggestion}</span>
        </div>
      </div>

      {/* Explanation */}
      <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed mb-4">
        <BookOpen className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
        <span>{issue.explanation}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onIgnore(issue.id)}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Ignore
        </button>
        <button
          ref={acceptBtnRef}
          type="button"
          onClick={() => onAccept(issue)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm shadow-indigo-200 transition-all cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          Accept
        </button>
      </div>
    </div>
  );
}
