import React, { useState } from 'react';
import { diffWords } from 'diff';
import { Check, Copy, FileText, SplitSquareVertical, Sparkles } from 'lucide-react';

export default function DiffView({ originalText, correctedText, onApplyAll }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('diff'); // 'diff' | 'clean' | 'split'

  if (!originalText && !correctedText) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No text available for preview.
      </div>
    );
  }

  const diffParts = diffWords(originalText || '', correctedText || '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(correctedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1.5 bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setViewMode('diff')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'diff'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Visual Diff
          </button>
          <button
            onClick={() => setViewMode('clean')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'clean'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clean Text
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-md transition-colors hidden sm:block ${
              viewMode === 'split'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Split View
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 shadow-xs transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Result</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 font-sans text-base leading-relaxed text-slate-800">
        {viewMode === 'diff' && (
          <div className="whitespace-pre-wrap">
            {diffParts.map((part, index) => {
              if (part.added) {
                return (
                  <span
                    key={index}
                    className="bg-emerald-100 text-emerald-950 px-1 py-0.5 rounded font-medium border-b border-emerald-400"
                    title="Suggested addition"
                  >
                    {part.value}
                  </span>
                );
              }
              if (part.removed) {
                return (
                  <del
                    key={index}
                    className="bg-rose-100 text-rose-900 px-1 py-0.5 rounded line-through opacity-75 mx-0.5"
                    title="Removed error"
                  >
                    {part.value}
                  </del>
                );
              }
              return <span key={index}>{part.value}</span>;
            })}
          </div>
        )}

        {viewMode === 'clean' && (
          <div className="whitespace-pre-wrap select-all">
            {correctedText || <span className="text-slate-400 italic">No corrections applied yet.</span>}
          </div>
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-2 gap-4 h-full text-sm">
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 overflow-y-auto">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Original</span>
              <div className="whitespace-pre-wrap text-slate-700">{originalText}</div>
            </div>
            <div className="border border-emerald-200 bg-emerald-50/20 rounded-lg p-3 overflow-y-auto">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-2">Corrected</span>
              <div className="whitespace-pre-wrap text-emerald-950 font-medium">{correctedText}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-400"></span> Added / Corrected
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400"></span> Removed
          </span>
        </div>
        <span className="text-[11px] text-slate-400">GrammarLens Auto-diff</span>
      </div>
    </div>
  );
}
