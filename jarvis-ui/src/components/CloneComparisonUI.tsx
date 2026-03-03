/**
 * Clone Comparison UI — Phase 7 Enterprise Feature
 *
 * Capabilities:
 * - Side-by-side clone analysis
 * - Reasoning comparison
 * - Performance metrics comparison
 * - Decision alignment visualization
 * - Detailed recommendation engine
 */

import React, { useState, useCallback } from 'react';

interface ComparisonMetrics {
  cloneId1: string;
  cloneId2: string;
  reasoningSimilarity: number;
  confidenceDelta: number;
  decisionAlignment: number;
  performanceDelta: {
    successRateDiff: number;
    activationRatioDiff: number;
  };
}

interface CloneComparisonProps {
  clone1Id: string;
  clone2Id: string;
  clone1Data?: any;
  clone2Data?: any;
  onCompare?: (metrics: ComparisonMetrics) => void;
}

export const CloneComparisonUI: React.FC<CloneComparisonProps> = ({
  clone1Id,
  clone2Id,
  clone1Data,
  clone2Data,
  onCompare,
}) => {
  const [selectedClones, setSelectedClones] = useState<[string, string]>([clone1Id, clone2Id]);
  const [comparison, setComparison] = useState<ComparisonMetrics | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performComparison = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mindclones/enterprise/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloneId1: selectedClones[0],
          cloneId2: selectedClones[1],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare clones');
      }

      const data = await response.json();
      setComparison(data.metrics);
      setAnalysis(data.analysis);

      if (onCompare) {
        onCompare(data.metrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedClones, onCompare]);

  const MetricBar: React.FC<{ label: string; value: number; max?: number }> = ({
    label,
    value,
    max = 1,
  }) => {
    const percentage = (value / max) * 100;
    const color =
      percentage > 80 ? 'bg-green-600' : percentage > 50 ? 'bg-yellow-600' : 'bg-red-600';

    return (
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-slate-300">{label}</span>
          <span className="text-sm font-semibold text-slate-200">
            {(percentage).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-800 rounded-lg p-6 border border-slate-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">🔄 Clone Comparison</h2>
        <p className="text-slate-400">Side-by-side analysis of two clones with detailed metrics</p>
      </div>

      {/* Clone Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Clone 1</label>
          <input
            type="text"
            value={selectedClones[0]}
            onChange={(e) => setSelectedClones([e.target.value, selectedClones[1]])}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            placeholder="Clone ID"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Clone 2</label>
          <input
            type="text"
            value={selectedClones[1]}
            onChange={(e) => setSelectedClones([selectedClones[0], e.target.value])}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            placeholder="Clone ID"
          />
        </div>
      </div>

      {/* Compare Button */}
      <button
        onClick={performComparison}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 px-4 rounded mb-6 transition"
      >
        {loading ? '⏳ Comparing...' : '▶ Compare Clones'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500 rounded p-4 mb-6 text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clone 1 Card */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4">🤖 {clone1Data?.expert_name || selectedClones[0]}</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-semibold text-green-400">{(clone1Data?.success_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Activations:</span>
                  <span className="font-semibold text-blue-400">{clone1Data?.activation_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Domain:</span>
                  <span className="font-semibold text-cyan-400">{clone1Data?.domain || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {/* Clone 2 Card */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4">🤖 {clone2Data?.expert_name || selectedClones[1]}</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-semibold text-green-400">{(clone2Data?.success_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Activations:</span>
                  <span className="font-semibold text-blue-400">{clone2Data?.activation_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Domain:</span>
                  <span className="font-semibold text-cyan-400">{clone2Data?.domain || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <h4 className="text-lg font-semibold text-white mb-4">📊 Comparison Metrics</h4>
            <MetricBar label="Reasoning Similarity" value={comparison.reasoningSimilarity} />
            <MetricBar label="Decision Alignment" value={comparison.decisionAlignment} />
            <div className="mt-4 p-3 bg-slate-600/30 rounded">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Confidence Difference:</span>
                <span className="font-semibold text-yellow-400">
                  {(comparison.confidenceDelta * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Performance Comparison */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <h4 className="text-lg font-semibold text-white mb-4">⚡ Performance Deltas</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-slate-600/30 rounded">
                <span className="text-slate-300">Success Rate Difference:</span>
                <span className={`font-semibold ${
                  comparison.performanceDelta.successRateDiff > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {comparison.performanceDelta.successRateDiff > 0 ? '+' : ''}
                  {(comparison.performanceDelta.successRateDiff * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-600/30 rounded">
                <span className="text-slate-300">Activation Ratio Difference:</span>
                <span className={`font-semibold ${
                  comparison.performanceDelta.activationRatioDiff > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {comparison.performanceDelta.activationRatioDiff > 0 ? '+' : ''}
                  {(comparison.performanceDelta.activationRatioDiff * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Analysis & Recommendations */}
          {analysis && (
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <h4 className="text-lg font-semibold text-white mb-4">💡 Analysis & Recommendations</h4>

              {/* Strengths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="font-semibold text-green-400 mb-2">Strengths of Clone 1:</h5>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {analysis.strengths1.length > 0 ? (
                      analysis.strengths1.map((strength: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span>{strength}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No significant strengths identified</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-green-400 mb-2">Strengths of Clone 2:</h5>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {analysis.strengths2.length > 0 ? (
                      analysis.strengths2.map((strength: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span>{strength}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No significant strengths identified</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="font-semibold text-red-400 mb-2">Weaknesses of Clone 1:</h5>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {analysis.weaknesses1.length > 0 ? (
                      analysis.weaknesses1.map((weakness: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-red-500 mr-2">✗</span>
                          <span>{weakness}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No significant weaknesses identified</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-red-400 mb-2">Weaknesses of Clone 2:</h5>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {analysis.weaknesses2.length > 0 ? (
                      analysis.weaknesses2.map((weakness: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-red-500 mr-2">✗</span>
                          <span>{weakness}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No significant weaknesses identified</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-blue-900/30 border border-blue-600 rounded p-3">
                <p className="text-blue-300 text-sm">
                  <span className="font-semibold">Recommendation:</span> {analysis.recommendations}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!comparison && !loading && (
        <div className="bg-slate-700/30 rounded-lg p-6 text-center">
          <p className="text-slate-400 text-sm">Select two clones and click "Compare Clones" to see detailed analysis</p>
        </div>
      )}
    </div>
  );
};

export default CloneComparisonUI;
