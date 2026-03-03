/**
 * Performance Chart — Real-time Performance Metrics Visualization
 *
 * Displays:
 * - Cache hit rate trend
 * - Query response times
 * - Clone load distribution
 * - Performance KPIs
 */

import React from 'react';
import { PerformanceMetrics } from '../hooks/useDistributedClones';

interface PerformanceChartProps {
  metrics: PerformanceMetrics | null;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-lg p-12 text-center">
        <p className="text-slate-400">📊 Loading performance metrics...</p>
      </div>
    );
  }

  const hitRateValue = parseFloat(metrics.caching.hitRate);
  const avgTimeValue = parseInt(metrics.performance.avgQueryTime);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Cache Hit Rate */}
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Cache Hit Rate</p>
          <p className="text-3xl font-bold text-green-400">{metrics.caching.hitRate}</p>
          <p className="text-xs text-slate-500 mt-2">Target: 70%</p>
          {hitRateValue >= 70 ? (
            <p className="text-xs text-green-400 mt-1">✓ Target achieved</p>
          ) : (
            <p className="text-xs text-yellow-400 mt-1">⚠ Below target</p>
          )}
        </div>

        {/* Avg Query Time */}
        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Avg Query Time</p>
          <p className="text-3xl font-bold text-blue-400">{metrics.performance.avgQueryTime}</p>
          <p className="text-xs text-slate-500 mt-2">Optimal: <500ms</p>
          {avgTimeValue < 500 ? (
            <p className="text-xs text-green-400 mt-1">✓ Performance good</p>
          ) : (
            <p className="text-xs text-yellow-400 mt-1">⚠ May need optimization</p>
          )}
        </div>

        {/* Cache Hits */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Cache Hits</p>
          <p className="text-3xl font-bold text-purple-400">
            {metrics.caching.cacheHits.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">Misses: {metrics.caching.cacheMisses.toLocaleString()}</p>
        </div>

        {/* Deduplication */}
        <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-700/50 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Requests Deduplicated</p>
          <p className="text-3xl font-bold text-orange-400">
            {metrics.performance.deduplicatedRequests}
          </p>
          <p className="text-xs text-slate-500 mt-2">API calls saved</p>
        </div>
      </div>

      {/* Caching Breakdown */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💾</span> Caching Breakdown
        </h3>

        <div className="space-y-4">
          {/* Hit vs Miss Ratio */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">Hit/Miss Ratio</span>
              <span className="text-slate-400 text-sm">
                {metrics.caching.cacheHits} hits / {metrics.caching.cacheMisses} misses
              </span>
            </div>

            <div className="w-full h-6 bg-slate-700 rounded-full overflow-hidden flex">
              <div
                className="bg-green-500 flex items-center justify-center text-xs font-bold text-white"
                style={{
                  width: `${hitRateValue}%`,
                }}
              >
                {hitRateValue > 15 ? `${hitRateValue.toFixed(1)}%` : ''}
              </div>
              <div className="bg-red-500 flex-1 flex items-center justify-center text-xs font-bold text-white">
                {100 - hitRateValue > 15 ? `${(100 - hitRateValue).toFixed(1)}%` : ''}
              </div>
            </div>
          </div>

          {/* Cache Levels */}
          <div className="mt-6 pt-4 border-t border-slate-700">
            <p className="text-slate-400 text-sm mb-3">Performance by Cache Level</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                <span className="text-slate-300">Local Cache (5-min)</span>
                <span className="font-bold text-green-400">~45ms</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                <span className="text-slate-300">Redis Cache (1-hour)</span>
                <span className="font-bold text-blue-400">~100ms</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                <span className="text-slate-300">Fresh Query (LLM)</span>
                <span className="font-bold text-orange-400">~324ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clone Load Distribution */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚖️</span> Clone Load Distribution
        </h3>

        <div className="space-y-3">
          {metrics.loadMetrics.slice(0, 10).map((metric, idx) => {
            const responseTime = parseInt(metric.responseTime);
            const successRateValue = parseFloat(metric.successRate);

            return (
              <div key={metric.cloneId}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">
                    {idx + 1}. {metric.cloneId}
                  </span>
                  <span className="text-slate-400 text-sm">
                    {metric.responseTime} | {metric.successRate}
                  </span>
                </div>

                {/* Load Bar */}
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      successRateValue >= 0.8
                        ? 'bg-green-500'
                        : successRateValue >= 0.6
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${successRateValue * 100}%` }}
                  ></div>
                </div>

                <p className="text-xs text-slate-500 mt-1">
                  Last used: {metric.lastUsed}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Processing */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📦</span> Batch Processing
          </h3>
          <p className="text-3xl font-bold text-purple-400">
            {metrics.performance.batchProcessed}
          </p>
          <p className="text-slate-400 text-sm mt-2">Requests processed in batches</p>
          <p className="text-xs text-slate-500 mt-2">
            Window: 100ms | Improves throughput
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🔄</span> Request Deduplication
          </h3>
          <p className="text-3xl font-bold text-cyan-400">
            {metrics.performance.deduplicatedRequests}
          </p>
          <p className="text-slate-400 text-sm mt-2">Duplicate requests merged</p>
          <p className="text-xs text-slate-500 mt-2">
            Saves: ~5-10% API calls
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
