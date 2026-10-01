import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

const TONES = [
  { id: 'general', label: 'Standard', desc: 'Balanced clarity & flow' },
  { id: 'formal', label: 'Formal', desc: 'Workplace & official' },
  { id: 'casual', label: 'Casual', desc: 'Friendly & conversational' },
  { id: 'academic', label: 'Academic', desc: 'Scholarly & research' },
];

export default function ToneSelector({ selectedTone, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs">
      <span className="hidden lg:flex items-center gap-1 px-2 text-slate-500 font-medium select-none">
        <SlidersHorizontal className="w-3 h-3" />
        Tone:
      </span>
      {TONES.map(tone => {
        const isActive = selectedTone === tone.id;
        return (
          <button
            key={tone.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tone.id)}
            title={tone.desc}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {tone.label}
          </button>
        );
      })}
    </div>
  );
}
