import React, { useRef, useEffect } from 'react';
import { Sparkles, Trash2, FileText, CornerDownLeft, Loader2, Code2 } from 'lucide-react';

const SAMPLES = {
  general: `Their are several reason why we should of delayed the release date. The team have decided to move foward regardless, but nobody in the meeting were listening to Sarahs concerns about stability. Its crucial that we dont make the same mistake twice.`,
  technical: `# Deployment Guide\n\nTo run the server, use \`npm run start:prod\` after setting the environment variables.\n\nThe database connection should of been initialized before calling \`connect()\`. There is many unhandled edge cases in the authentication middleware that causes the microservice to crash unexpected.\n\n\`\`\`javascript\n// Developer code here\nconst result = await processPayload(req.body);\nif (!result.isValid) return false;\n\`\`\`\n\nEnsure that all dependecies are installed properly before deploying to cluster.`,
  academic: `In this paper, it is demonstrated by us that significant improvements in model accuracy is obtained. Due to the fact that prior experiments was flawed, we utilizes a novel framework which have superior performance across multiple diverse benchmarks.`
};

export default function Editor({
  text,
  onChange,
  onCheck,
  loading,
  wordCount,
  charCount,
  onClear,
  devMode
}) {
  const textareaRef = useRef(null);

  const isWordLimitExceeded = wordCount > 3000;
  const isWordLimitApproaching = wordCount > 2500 && !isWordLimitExceeded;

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to run check
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!loading && text.trim().length > 0 && !isWordLimitExceeded) {
        onCheck();
      }
    }
  };

  const loadSample = (type) => {
    onChange(SAMPLES[type] || SAMPLES.general);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Editor toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-700">Samples:</span>
          <button
            type="button"
            onClick={() => loadSample('general')}
            className="px-2 py-1 rounded hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors"
          >
            General
          </button>
          <button
            type="button"
            onClick={() => loadSample('technical')}
            className="px-2 py-1 rounded hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1"
          >
            <Code2 className="w-3 h-3 text-purple-600" />
            Markdown
          </button>
          <button
            type="button"
            onClick={() => loadSample('academic')}
            className="px-2 py-1 rounded hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors"
          >
            Academic
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {text.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
              title="Clear text"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            devMode
              ? "Type or paste your Markdown documentation, README, or commit message here... (Code blocks inside ``` or ` will be respected and skipped)"
              : "Paste or type your text here to check for grammar, spelling, sentence structure, and tone..."
          }
          className="w-full h-full min-h-[300px] resize-none border-0 outline-none text-base leading-relaxed text-slate-800 placeholder:text-slate-400 font-sans"
        />
      </div>

      {/* Footer bar with Stats and Action */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 gap-3">
        <div className="flex items-center gap-3 text-xs">
          <span
            className={`font-medium ${
              isWordLimitExceeded
                ? 'text-rose-600 font-bold'
                : isWordLimitApproaching
                ? 'text-amber-600'
                : 'text-slate-500'
            }`}
          >
            {wordCount.toLocaleString()} / 3,000 words
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400">{charCount.toLocaleString()} chars</span>
          {isWordLimitExceeded && (
            <span className="text-rose-600 font-medium">Text exceeds 3,000 words limit!</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono">
            ⌘+Enter
          </span>
          <button
            type="button"
            disabled={loading || text.trim().length === 0 || isWordLimitExceeded}
            onClick={onCheck}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Check Text</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
