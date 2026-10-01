import React, { useRef } from 'react';

const HIGHLIGHT_STYLES = {
  grammar: 'border-b-2 border-rose-500 bg-rose-100/60 text-rose-950 hover:bg-rose-200/70',
  spelling: 'border-b-2 border-amber-500 bg-amber-100/60 text-amber-950 hover:bg-amber-200/70',
  structure: 'border-b-2 border-purple-500 bg-purple-100/60 text-purple-950 hover:bg-purple-200/70',
  style: 'border-b-2 border-sky-500 bg-sky-100/60 text-sky-950 hover:bg-sky-200/70'
};

const ACTIVE_STYLES = {
  grammar: 'ring-2 ring-rose-500 bg-rose-200/90',
  spelling: 'ring-2 ring-amber-500 bg-amber-200/90',
  structure: 'ring-2 ring-purple-500 bg-purple-200/90',
  style: 'ring-2 ring-sky-500 bg-sky-200/90'
};

export default function HighlightedText({
  text,
  issues = [],
  activeIssueId,
  onSelectIssue,
  devMode = false
}) {
  const containerRef = useRef(null);

  // If no text, return empty placeholder
  if (!text) return null;

  // If no issues, render normal text with code block styling if devMode
  if (!issues || issues.length === 0) {
    return (
      <div className="whitespace-pre-wrap font-sans text-base leading-relaxed text-slate-800 selection:bg-indigo-100">
        {text}
      </div>
    );
  }

  // Sort issues strictly by startIndex
  const sortedIssues = [...issues].sort((a, b) => a.startIndex - b.startIndex);

  // Segment the text into plain text chunks and issue spans
  const segments = [];
  let currentIndex = 0;

  for (const issue of sortedIssues) {
    // If there is valid text before this issue
    if (issue.startIndex > currentIndex) {
      segments.push({
        type: 'text',
        content: text.slice(currentIndex, issue.startIndex),
        key: `text_${currentIndex}`
      });
    }

    // Add the highlighted issue
    if (issue.startIndex >= currentIndex && issue.endIndex <= text.length) {
      segments.push({
        type: 'issue',
        issue,
        content: text.slice(issue.startIndex, issue.endIndex),
        key: `issue_${issue.id}`
      });
      currentIndex = issue.endIndex;
    }
  }

  // Trailing text after the last issue
  if (currentIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(currentIndex),
      key: `text_end_${currentIndex}`
    });
  }

  const handleSpanClick = (e, issue) => {
    e.stopPropagation();
    if (!containerRef.current) {
      onSelectIssue(issue, null);
      return;
    }

    const spanRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Position relative to container
    const top = spanRect.bottom - containerRect.top + 8;
    // Keep popover inside horizontal bounds
    const maxLeft = Math.max(10, containerRect.width - 380);
    const calculatedLeft = spanRect.left - containerRect.left;
    const left = Math.min(Math.max(10, calculatedLeft), maxLeft);

    onSelectIssue(issue, { top, left });
  };

  return (
    <div
      ref={containerRef}
      className="relative whitespace-pre-wrap font-sans text-base leading-relaxed text-slate-800 selection:bg-indigo-100"
    >
      {segments.map((seg) => {
        if (seg.type === 'text') {
          return <span key={seg.key}>{seg.content}</span>;
        }

        const issue = seg.issue;
        const isActive = activeIssueId === issue.id;
        const baseStyle = HIGHLIGHT_STYLES[issue.type] || HIGHLIGHT_STYLES.grammar;
        const activeStyle = isActive ? (ACTIVE_STYLES[issue.type] || 'ring-2 ring-indigo-500') : '';

        return (
          <button
            key={seg.key}
            type="button"
            onClick={(e) => handleSpanClick(e, issue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSpanClick(e, issue);
              }
            }}
            aria-label={`${issue.type} issue: "${issue.original}". Suggestion: "${issue.suggestion}". Click to view details.`}
            className={`inline rounded px-0.5 py-0.5 mx-0.5 transition-all text-left font-inherit cursor-pointer ${baseStyle} ${activeStyle}`}
          >
            {seg.content}
          </button>
        );
      })}
    </div>
  );
}
