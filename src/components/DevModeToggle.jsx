import React from 'react';
import { Code, Terminal } from 'lucide-react';

export default function DevModeToggle({ devMode, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!devMode)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
        devMode
          ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-xs'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title="Developer mode skips fenced code blocks and inline backticks so variable names and snippets are not flagged as typos"
    >
      <Terminal className={`w-3.5 h-3.5 ${devMode ? 'text-purple-600' : 'text-slate-400'}`} />
      <span>Dev Mode</span>
      <span
        className={`w-2 h-2 rounded-full transition-colors ${
          devMode ? 'bg-purple-600 animate-pulse' : 'bg-slate-300'
        }`}
      />
    </button>
  );
}
