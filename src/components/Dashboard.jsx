import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  History, 
  AlertTriangle, 
  Database, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  X,
  Sparkles,
  BookOpen
} from 'lucide-react';

export default function Dashboard({ sessionId, onClose, onSelectHistoryItem }) {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'history'

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch(`/api/stats?sessionId=${encodeURIComponent(sessionId)}`),
        fetch(`/api/history?sessionId=${encodeURIComponent(sessionId)}&limit=30`)
      ]);

      if (!statsRes.ok || !historyRes.ok) {
        throw new Error('Failed to load dashboard metrics');
      }

      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      setStats(statsData);
      setHistory(historyData.history || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [sessionId]);

  const typeTotal = stats?.typeCounts
    ? Object.values(stats.typeCounts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Mistakes & Writing Analytics</h2>
              <p className="text-xs text-slate-500">
                Track recurring error patterns and review your check history
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              title="Refresh statistics"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher & DB Status */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-100/70 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Error Breakdown
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Session History ({history.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500">
            <Database className="w-3.5 h-3.5" />
            <span>
              {stats?.isMongoConnected ? (
                <span className="text-emerald-700 font-medium">MongoDB Connected</span>
              ) : (
                <span className="text-indigo-600 font-medium">Session Store Active</span>
              )}
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && !stats ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
              <p className="text-sm">Calculating error analytics...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          ) : activeTab === 'analytics' ? (
            <>
              {/* Metric KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Checks</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{stats?.totalChecks || 0}</div>
                  <span className="text-[11px] text-slate-400">Analyses run this session</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Issues Identified</span>
                  <div className="text-2xl font-bold text-rose-600 mt-1">{stats?.totalIssuesFound || 0}</div>
                  <span className="text-[11px] text-slate-400">Total detected problems</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Accuracy Impact</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {stats?.totalChecks > 0
                      ? `${(stats.totalIssuesFound / stats.totalChecks).toFixed(1)} / check`
                      : '0'}
                  </div>
                  <span className="text-[11px] text-slate-400">Average errors per pass</span>
                </div>
              </div>

              {/* Error type breakdown bars */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <span>Error Distribution by Category</span>
                </h3>

                <div className="space-y-3 pt-2">
                  {[
                    { key: 'grammar', label: 'Grammar', color: 'bg-rose-500', barBg: 'bg-rose-100', text: 'text-rose-700' },
                    { key: 'spelling', label: 'Spelling', color: 'bg-amber-500', barBg: 'bg-amber-100', text: 'text-amber-700' },
                    { key: 'structure', label: 'Sentence Structure', color: 'bg-purple-500', barBg: 'bg-purple-100', text: 'text-purple-700' },
                    { key: 'style', label: 'Style & Clarity', color: 'bg-sky-500', barBg: 'bg-sky-100', text: 'text-sky-700' },
                  ].map(({ key, label, color, barBg, text }) => {
                    const count = stats?.typeCounts?.[key] || 0;
                    const percent = typeTotal > 0 ? Math.round((count / typeTotal) * 100) : 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700">{label}</span>
                          <span className={text}>{count} issues ({percent}%)</span>
                        </div>
                        <div className={`h-2.5 w-full rounded-full ${barBg} overflow-hidden`}>
                          <div
                            className={`h-full rounded-full ${color} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top repetitive mistakes */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Most Frequent Mistakes</span>
                </h3>

                {stats?.topRepetitive && stats.topRepetitive.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stats.topRepetitive.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[180px]">
                          "{item.word}"
                        </span>
                        <span className="font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                          {item.count} {item.count === 1 ? 'time' : 'times'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No repetitive error patterns detected yet. Run more checks to build your writing profile!
                  </p>
                )}
              </div>
            </>
          ) : (
            /* History view */
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No checks saved in this session yet.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item._id || item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.tone || 'general'}
                        </span>
                        {item.devMode && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            DEV MODE
                          </span>
                        )}
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="font-semibold text-rose-600">
                        {item.issues?.length || item.issuesCount || 0} issues
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 line-clamp-2 font-mono bg-slate-50 p-2 rounded">
                      {item.originalText}
                    </p>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          onSelectHistoryItem(item);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <span>Restore in Editor</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
