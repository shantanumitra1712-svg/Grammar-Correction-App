import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  BarChart2, 
  CheckCheck, 
  RotateCcw, 
  Layers, 
  ArrowRight, 
  FileEdit, 
  Eye, 
  GitCompare,
  Filter,
  Check
} from 'lucide-react';
import Editor from './components/Editor.jsx';
import HighlightedText from './components/HighlightedText.jsx';
import IssuePopover from './components/IssuePopover.jsx';
import DiffView from './components/DiffView.jsx';
import Dashboard from './components/Dashboard.jsx';
import ToneSelector from './components/ToneSelector.jsx';
import DevModeToggle from './components/DevModeToggle.jsx';

// Get or generate persistent anonymous session ID
function getSessionId() {
  let sid = localStorage.getItem('grammarlens_session_id');
  if (!sid) {
    sid = 'anon_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('grammarlens_session_id', sid);
  }
  return sid;
}

export default function App() {
  const [sessionId] = useState(getSessionId);
  const [text, setText] = useState('');
  const [issues, setIssues] = useState([]);
  const [correctedText, setCorrectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tone, setTone] = useState('general');
  const [devMode, setDevMode] = useState(false);

  // UI view state
  const [viewTab, setViewTab] = useState('editor'); // 'editor' | 'diff'
  const [activeIssue, setActiveIssue] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showDashboard, setShowDashboard] = useState(false);
  const [notification, setNotification] = useState(null);

  // Compute live word and character count
  const { wordCount, charCount } = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return { wordCount: words, charCount: text.length };
  }, [text]);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Perform grammar check
  const handleCheck = async () => {
    if (!text || text.trim().length === 0) return;
    setLoading(true);
    setError(null);
    setActiveIssue(null);
    setPopoverPos(null);

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          tone,
          devMode,
          sessionId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Grammar check failed');
      }

      setIssues(data.issues || []);
      setCorrectedText(data.correctedText || text);

      if (data.issues && data.issues.length === 0) {
        showToast(' Excellent! No grammar or spelling errors detected.');
      } else {
        showToast(` Found ${data.issues.length} potential improvements.`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while connecting to the check service.');
    } finally {
      setLoading(false);
    }
  };

  // Accept a single issue: replace the slice in text and adjust remaining issue indices
  const handleAcceptIssue = (issueToAccept) => {
    const { startIndex, endIndex, suggestion } = issueToAccept;

    // Apply the replacement to current text
    const newText = text.slice(0, startIndex) + suggestion + text.slice(endIndex);
    const lengthDelta = suggestion.length - (endIndex - startIndex);

    // Update remaining issues by removing this one and shifting subsequent indices
    const updatedIssues = issues
      .filter(iss => iss.id !== issueToAccept.id)
      .map(iss => {
        if (iss.startIndex > startIndex) {
          return {
            ...iss,
            startIndex: iss.startIndex + lengthDelta,
            endIndex: iss.endIndex + lengthDelta
          };
        }
        return iss;
      });

    setText(newText);
    setIssues(updatedIssues);
    setActiveIssue(null);
    setPopoverPos(null);

    // Update corrected text
    fetch('/api/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalText: newText, issues: updatedIssues })
    })
      .then(res => res.json())
      .then(data => {
        if (data.correctedText) setCorrectedText(data.correctedText);
      })
      .catch(console.error);

    showToast('Applied suggestion.');
  };

  // Ignore single issue
  const handleIgnoreIssue = (issueId) => {
    setIssues(prev => prev.filter(iss => iss.id !== issueId));
    if (activeIssue?.id === issueId) {
      setActiveIssue(null);
      setPopoverPos(null);
    }
  };

  // Accept all issues at once
  const handleAcceptAll = () => {
    if (!correctedText) return;
    setText(correctedText);
    setIssues([]);
    setActiveIssue(null);
    setPopoverPos(null);
    showToast(' All corrections accepted!');
  };

  // Restore history record from Dashboard
  const handleSelectHistoryItem = (item) => {
    setText(item.originalText || '');
    setIssues(item.issues || []);
    if (item.tone) setTone(item.tone);
    if (item.devMode !== undefined) setDevMode(item.devMode);
    setViewTab('editor');
    showToast('Restored previous check session.');
  };

  // Filtered issues
  const filteredIssues = useMemo(() => {
    if (filterType === 'all') return issues;
    return issues.filter(iss => iss.type === filterType);
  }, [issues, filterType]);

  // Count by issue type
  const issueCounts = useMemo(() => {
    const counts = { grammar: 0, spelling: 0, structure: 0, style: 0 };
    issues.forEach(iss => {
      if (counts[iss.type] !== undefined) counts[iss.type]++;
    });
    return counts;
  }, [issues]);

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-xl animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">GrammarLens</h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  MERN AI
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400">
                Grammar, spelling & sentence structure engine
              </p>
            </div>
          </div>

          {/* Controls: Tone & Dev Mode */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ToneSelector
              selectedTone={tone}
              onChange={setTone}
              disabled={loading}
            />

            <DevModeToggle
              devMode={devMode}
              onChange={setDevMode}
              disabled={loading}
            />

            <button
              type="button"
              onClick={() => setShowDashboard(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">My Mistakes</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-4">
        {/* Error notification banner if request fails */}
        {error && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="font-medium hover:underline text-rose-700 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View Switcher Tabs & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewTab('editor')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewTab === 'editor'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Editor & Highlight</span>
              {issues.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
                  {issues.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewTab('diff')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewTab === 'diff'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Diff View & Preview</span>
            </button>
          </div>

          {issues.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Accept All ({issues.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Editor OR Diff View (8 cols on large screens) */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            {viewTab === 'editor' ? (
              <>
                <Editor
                  text={text}
                  onChange={(val) => {
                    setText(val);
                    if (issues.length > 0) setIssues([]);
                  }}
                  onCheck={handleCheck}
                  loading={loading}
                  wordCount={wordCount}
                  charCount={charCount}
                  onClear={() => {
                    setText('');
                    setIssues([]);
                    setActiveIssue(null);
                  }}
                  devMode={devMode}
                />

                {/* Inline Highlighted Text Display (visible when text and issues exist) */}
                {issues.length > 0 && (
                  <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs relative">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Interactive Highlighted View (Click an error to review)</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found
                      </span>
                    </div>

                    <HighlightedText
                      text={text}
                      issues={filteredIssues}
                      activeIssueId={activeIssue?.id}
                      onSelectIssue={(issue, pos) => {
                        setActiveIssue(issue);
                        setPopoverPos(pos);
                      }}
                      devMode={devMode}
                    />

                    {/* Popover anchored to active issue */}
                    {activeIssue && (
                      <IssuePopover
                        issue={activeIssue}
                        position={popoverPos}
                        onAccept={handleAcceptIssue}
                        onIgnore={handleIgnoreIssue}
                        onClose={() => {
                          setActiveIssue(null);
                          setPopoverPos(null);
                        }}
                      />
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="min-h-[500px]">
                <DiffView
                  originalText={text}
                  correctedText={correctedText}
                  onApplyAll={handleAcceptAll}
                />
              </div>
            )}
          </div>

          {/* Right Column: Issue Inspector & Quick Filter Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Issue summary panel */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <span>Detected Issues</span>
                  <span className="text-xs font-normal text-slate-400">
                    ({filteredIssues.length} of {issues.length})
                  </span>
                </h3>

                {issues.length > 0 && (
                  <button
                    onClick={() => setFilterType('all')}
                    className="text-[11px] text-slate-500 hover:text-indigo-600"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Type Category Filter Chips */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => setFilterType('grammar')}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    filterType === 'grammar'
                      ? 'border-rose-300 bg-rose-50 text-rose-900 font-semibold'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Grammar
                  </span>
                  <span className="text-[11px] font-mono opacity-80">{issueCounts.grammar}</span>
                </button>

                <button
                  onClick={() => setFilterType('spelling')}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    filterType === 'spelling'
                      ? 'border-amber-300 bg-amber-50 text-amber-900 font-semibold'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Spelling
                  </span>
                  <span className="text-[11px] font-mono opacity-80">{issueCounts.spelling}</span>
                </button>

                <button
                  onClick={() => setFilterType('structure')}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    filterType === 'structure'
                      ? 'border-purple-300 bg-purple-50 text-purple-900 font-semibold'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Structure
                  </span>
                  <span className="text-[11px] font-mono opacity-80">{issueCounts.structure}</span>
                </button>

                <button
                  onClick={() => setFilterType('style')}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                    filterType === 'style'
                      ? 'border-sky-300 bg-sky-50 text-sky-900 font-semibold'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Style
                  </span>
                  <span className="text-[11px] font-mono opacity-80">{issueCounts.style}</span>
                </button>
              </div>

              {/* Scrollable list of active issues */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {issues.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 opacity-60" />
                    <p className="text-xs">
                      {text.trim().length === 0
                        ? 'Type or paste text and click "Check Text"'
                        : 'No pending issues found!'}
                    </p>
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No {filterType} issues found.
                  </div>
                ) : (
                  filteredIssues.map((issue) => {
                    const isSelected = activeIssue?.id === issue.id;
                    return (
                      <div
                        key={issue.id}
                        onClick={() => {
                          setActiveIssue(issue);
                          setPopoverPos(null);
                        }}
                        className={`p-3 rounded-xl border text-xs transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-50/50 shadow-xs'
                            : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                              issue.type === 'grammar'
                                ? 'bg-rose-100 text-rose-800'
                                : issue.type === 'spelling'
                                ? 'bg-amber-100 text-amber-800'
                                : issue.type === 'structure'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {issue.type}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIgnoreIssue(issue.id);
                            }}
                            className="text-slate-400 hover:text-slate-600 text-[11px]"
                          >
                            Dismiss
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-rose-600 line-through bg-rose-50 px-1 rounded">
                            {issue.original}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 rounded">
                            {issue.suggestion}
                          </span>
                        </div>

                        <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                          {issue.explanation}
                        </p>

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptIssue(issue);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] transition-colors shadow-xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dashboard Modal */}
      {showDashboard && (
        <Dashboard
          sessionId={sessionId}
          onClose={() => setShowDashboard(false)}
          onSelectHistoryItem={handleSelectHistoryItem}
        />
      )}
    </div>
  );
}
