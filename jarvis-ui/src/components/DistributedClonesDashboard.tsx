/**
 * Distributed Clones Dashboard — Phase 6 Main Component
 *
 * Displays:
 * - System health overview
 * - Clone registry statistics
 * - Performance metrics
 * - Real-time consensus visualization
 * - Clone management interface
 */

import React, { useState } from 'react';
import useDistributedClones from '../hooks/useDistributedClones';
import HealthCard from './HealthCard';
import RegistryStats from './RegistryStats';
import PerformanceChart from './PerformanceChart';
import ConsensusBuilder from './ConsensusBuilder';
import CloneManagement from './CloneManagement';

export const DistributedClonesDashboard: React.FC = () => {
  const {
    isLoading,
    error,
    consensus,
    registryStats,
    performanceMetrics,
    systemHealth,
    getDistributedConsensus,
    getRegistryStats,
    rollbackClone,
    archiveClone,
  } = useDistributedClones();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'consensus' | 'clones' | 'performance'
  >('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          Distributed Mind Clones
        </h1>
        <p className="text-slate-400">
          Phase 5: Distributed Execution & Scaling | Real-time consensus reasoning
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg">
          <p className="text-red-300">⚠️ Error: {error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-4 border-b border-slate-700">
        {(['overview', 'consensus', 'clones', 'performance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'overview' && '📊 Overview'}
            {tab === 'consensus' && '⚡ Consensus'}
            {tab === 'clones' && '🤖 Clones'}
            {tab === 'performance' && '⚙️ Performance'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Health Card */}
          {systemHealth && (
            <HealthCard
              health={systemHealth}
              isLoading={isLoading}
            />
          )}

          {/* Registry Statistics */}
          {registryStats && (
            <RegistryStats stats={registryStats} />
          )}

          {/* Performance Snapshot */}
          {performanceMetrics && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Cache Hit Rate</p>
                <p className="text-3xl font-bold text-green-400">
                  {performanceMetrics.caching.hitRate}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  {performanceMetrics.caching.cacheHits} hits
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Avg Query Time</p>
                <p className="text-3xl font-bold text-blue-400">
                  {performanceMetrics.performance.avgQueryTime}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Cached: ~45ms | Fresh: ~324ms
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Deduplication</p>
                <p className="text-3xl font-bold text-purple-400">
                  {performanceMetrics.performance.deduplicatedRequests}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  API calls saved
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consensus Tab */}
      {activeTab === 'consensus' && (
        <ConsensusBuilder
          onConsensus={getDistributedConsensus}
          result={consensus}
          isLoading={isLoading}
          cloneDomains={registryStats?.registry.clonesByDomain}
        />
      )}

      {/* Clones Tab */}
      {activeTab === 'clones' && (
        <CloneManagement
          clones={registryStats?.registry.topClones}
          onRollback={rollbackClone}
          onArchive={archiveClone}
          isLoading={isLoading}
          onRefresh={getRegistryStats}
        />
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <PerformanceChart metrics={performanceMetrics} />
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <div className="w-4 h-4 bg-white rounded-full animate-spin"></div>
          Loading...
        </div>
      )}
    </div>
  );
};

export default DistributedClonesDashboard;
