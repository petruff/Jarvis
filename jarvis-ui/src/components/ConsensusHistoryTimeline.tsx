/**
 * Consensus History Timeline — Phase 7 Enterprise Feature
 *
 * Capabilities:
 * - Timeline visualization of consensus decisions
 * - Trend analysis and quality metrics
 * - Decision reversals and disputes
 * - Historical decision search and filtering
 * - Decision quality trending
 */

import React, { useState, useCallback, useEffect } from 'react';

interface HistoricalConsensus {
  id: string;
  query: string;
  decision: string;
  confidence: number;
  timestamp: number;
  domain?: string;
  status: 'active' | 'reversed' | 'updated' | 'disputed';
  reasonForChange?: string;
  tags: string[];
}

interface ConsensusTimeline {
  period: string;
  decisions: HistoricalConsensus[];
  metrics: {
    totalDecisions: number;
    avgConfidence: number;
    reversalRate: number;
    disputeRate: number;
    topDomains: { domain: string; count: number }[];
  };
}

interface TrendAnalysis {
  trend: 'improving' | 'degrading' | 'stable';
  confidenceTrend: number;
  reversalTrend: number;
  disputeTrend: number;
}

interface ConsensusHistoryTimelineProps {
  onPeriodChange?: (period: string) => void;
}

export const ConsensusHistoryTimeline: React.FC<ConsensusHistoryTimelineProps> = ({
  onPeriodChange,
}) => {
  const [period, setPeriod] = useState<'1d' | '7d' | '30d'>('7d');
  const [timeline, setTimeline] = useState<ConsensusTimeline | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<HistoricalConsensus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [timelineRes, trendRes] = await Promise.all([
        fetch(`/api/mindclones/enterprise/history/timeline?period=${period}`),
        fetch(`/api/mindclones/enterprise/history/trends?period=${period}`),
      ]);

      if (!timelineRes.ok || !trendRes.ok) {
        throw new Error('Failed to fetch timeline data');
      }

      const timelineData = await timelineRes.json();
      const trendData = await trendRes.json();

      setTimeline(timelineData);
      setTrendAnalysis(trendData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchTimeline();
    if (onPeriodChange) {
      onPeriodChange(period);
    }
  }, [period, fetchTimeline, onPeriodChange]);

  const getTrendColor = (trend: string): string => {
    if (trend === 'improving') return 'text-green-400';
    if (trend === 'degrading') return 'text-red-400';
    return 'text-yellow-400';
  };

  const getStatusBadge = (status: string): React.ReactNode => {
    const badgeClasses: Record<string, string> = {
      active: 'bg-green-900/30 text-green-300 border-green-600',
      reversed: 'bg-red-900/30 text-red-300 border-red-600',
      updated: 'bg-blue-900/30 text-blue-300 border-blue-600',
      disputed: 'bg-yellow-900/30 text-yellow-300 border-yellow-600',
    };

    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${badgeClasses[status] || ''}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const filteredDecisions = timeline?.decisions.filter(
    (d) =>
      d.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.decision.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.domain && d.domain.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  return (
    <div className="w-full bg-slate-800 rounded-lg p-6 border border-slate-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">📅 Consensus History Timeline</h2>
        <p className="text-slate-400">Track decision quality, reversals, and disputes over time</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {(['1d', '7d', '30d'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded font-semibold transition ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {p === '1d' ? 'Last 24h' : p === '7d' ? 'Last 7d' : 'Last 30d'}
          </button>
        ))}
      </div>

      {/* Trend Analysis */}
      {trendAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="text-sm text-slate-400 mb-2">Overall Trend</div>
            <div className={`text-2xl font-bold ${getTrendColor(trendAnalysis.trend)}`}>
              {trendAnalysis.trend === 'improving' ? '📈' : trendAnalysis.trend === 'degrading' ? '📉' : '➡️'}
            </div>
            <div className={`text-sm font-semibold ${getTrendColor(trendAnalysis.trend)} mt-1`}>
              {trendAnalysis.trend.charAt(0).toUpperCase() + trendAnalysis.trend.slice(1)}
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="text-sm text-slate-400 mb-2">Confidence Trend</div>
            <div className={`text-2xl font-bold ${trendAnalysis.confidenceTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trendAnalysis.confidenceTrend > 0 ? '+' : ''}
              {(trendAnalysis.confidenceTrend * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="text-sm text-slate-400 mb-2">Reversal Trend</div>
            <div className={`text-2xl font-bold ${trendAnalysis.reversalTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trendAnalysis.reversalTrend > 0 ? '+' : ''}
              {(trendAnalysis.reversalTrend * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="text-sm text-slate-400 mb-2">Dispute Trend</div>
            <div className={`text-2xl font-bold ${trendAnalysis.disputeTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trendAnalysis.disputeTrend > 0 ? '+' : ''}
              {(trendAnalysis.disputeTrend * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Metrics Summary */}
      {timeline && (
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Period Metrics ({period})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-400">Total Decisions</div>
              <div className="text-2xl font-bold text-blue-400">{timeline.metrics.totalDecisions}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Avg Confidence</div>
              <div className="text-2xl font-bold text-green-400">
                {(timeline.metrics.avgConfidence * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Reversal Rate</div>
              <div className="text-2xl font-bold text-yellow-400">
                {(timeline.metrics.reversalRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Dispute Rate</div>
              <div className="text-2xl font-bold text-red-400">
                {(timeline.metrics.disputeRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Top Domains */}
          {timeline.metrics.topDomains.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-600">
              <div className="text-sm font-semibold text-slate-300 mb-2">Top Domains</div>
              <div className="flex flex-wrap gap-2">
                {timeline.metrics.topDomains.slice(0, 5).map((domain, idx) => (
                  <span key={idx} className="bg-cyan-900/30 text-cyan-300 text-xs px-2 py-1 rounded border border-cyan-600">
                    {domain.domain}: {domain.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search decisions by query, decision text, or domain..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin">⏳</div>
          <p className="text-slate-400 mt-2">Loading timeline...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-500 rounded p-4 text-red-300">
          ⚠️ {error}
        </div>
      ) : filteredDecisions.length > 0 ? (
        <div className="space-y-4">
          {filteredDecisions.map((decision, idx) => (
            <div
              key={decision.id}
              onClick={() => setSelectedDecision(decision)}
              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-blue-500 cursor-pointer transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(decision.status)}
                    {decision.domain && (
                      <span className="text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded">
                        {decision.domain}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">{decision.query}</h4>
                  <p className="text-sm text-slate-400 line-clamp-2">{decision.decision}</p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {(decision.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(decision.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {decision.reasonForChange && (
                <div className="text-xs text-slate-400 p-2 bg-slate-600/20 rounded mt-2">
                  <span className="font-semibold">Change reason:</span> {decision.reasonForChange}
                </div>
              )}

              {decision.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {decision.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs bg-indigo-900/30 text-indigo-300 px-1.5 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-700/30 rounded-lg p-6 text-center">
          <p className="text-slate-400 text-sm">
            {searchTerm ? 'No decisions match your search' : 'No decisions found for this period'}
          </p>
        </div>
      )}

      {/* Selected Decision Details */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-600 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Decision Details</h3>
              <button
                onClick={() => setSelectedDecision(null)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400">Query</label>
                <p className="text-white mt-1">{selectedDecision.query}</p>
              </div>

              <div>
                <label className="text-sm text-slate-400">Decision</label>
                <p className="text-white mt-1">{selectedDecision.decision}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Confidence</label>
                  <p className="text-white font-semibold mt-1">{(selectedDecision.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedDecision.status)}</div>
                </div>
              </div>

              {selectedDecision.reasonForChange && (
                <div>
                  <label className="text-sm text-slate-400">Change Reason</label>
                  <p className="text-white mt-1">{selectedDecision.reasonForChange}</p>
                </div>
              )}

              <div>
                <label className="text-sm text-slate-400">Timestamp</label>
                <p className="text-white mt-1">{new Date(selectedDecision.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsensusHistoryTimeline;
