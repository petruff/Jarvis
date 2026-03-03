/**
 * Registry Stats — Clone Registry Statistics View
 *
 * Displays:
 * - Total clones by domain
 * - Top performing clones
 * - Domain distribution
 */

import React from 'react';
import { RegistryStats as IRegistryStats } from '../hooks/useDistributedClones';

interface RegistryStatsProps {
  stats: IRegistryStats;
}

const RegistryStats: React.FC<RegistryStatsProps> = ({ stats }) => {
  const { registry, coordinator } = stats;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Total Clones</p>
          <p className="text-3xl font-bold text-blue-400">{registry.totalClones}</p>
          <p className="text-slate-500 text-xs mt-2">
            {registry.activeClones} active
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <p className="text-slate-400 text-sm mb-2">Average Success Rate</p>
          <p className="text-3xl font-bold text-green-400">
            {registry.averageSuccessRate}
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Across all domains
          </p>
        </div>
      </div>

      {/* Clones by Domain */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🏷️</span> Clones by Domain
        </h3>

        <div className="space-y-3">
          {Object.entries(registry.clonesByDomain).map(([domain, count]) => {
            const percentage = (count / registry.totalClones) * 100;
            return (
              <div key={domain}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">{domain}</span>
                  <span className="text-slate-400 text-sm">{count} clones</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performing Clones */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⭐</span> Top Performing Clones
        </h3>

        <div className="space-y-2">
          {registry.topClones.slice(0, 5).map((clone, idx) => (
            <div
              key={clone.id}
              className="flex items-center justify-between p-3 bg-slate-700/30 rounded hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-400">#{idx + 1}</span>
                <div>
                  <p className="font-semibold text-slate-200">{clone.expertName}</p>
                  <p className="text-xs text-slate-400">{clone.domain}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-400">
                  {(clone.successRate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400">
                  {clone.activationCount} activations
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coordinator Status */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-2">Healthy Nodes</p>
          <p className="text-2xl font-bold text-green-400">{coordinator.healthy}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-2">Unhealthy Nodes</p>
          <p className={`text-2xl font-bold ${coordinator.unhealthy > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {coordinator.unhealthy}
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-2">Avg Response Time</p>
          <p className="text-2xl font-bold text-blue-400">
            {coordinator.avgResponseTime}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistryStats;
