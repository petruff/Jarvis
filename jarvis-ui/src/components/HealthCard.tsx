/**
 * Health Card — System Status Overview
 *
 * Displays:
 * - System status (HEALTHY / DEGRADED / OFFLINE)
 * - Active clones count
 * - Circuit breaker state
 * - Average response time
 */

import React from 'react';
import { SystemHealth } from '../hooks/useDistributedClones';

interface HealthCardProps {
  health: SystemHealth;
  isLoading: boolean;
}

const HealthCard: React.FC<HealthCardProps> = ({ health, isLoading }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-green-400';
      case 'DEGRADED':
        return 'text-yellow-400';
      case 'OFFLINE':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-green-900/20 border-green-700';
      case 'DEGRADED':
        return 'bg-yellow-900/20 border-yellow-700';
      case 'OFFLINE':
        return 'bg-red-900/20 border-red-700';
      default:
        return 'bg-slate-800/20 border-slate-700';
    }
  };

  return (
    <div className={`${getStatusBgColor(health.systemStatus)} border rounded-lg p-8`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-400 text-sm mb-2">System Status</p>
          <p className={`text-4xl font-bold ${getStatusColor(health.systemStatus)}`}>
            {health.systemStatus}
          </p>
        </div>
        <div className="text-6xl">
          {health.systemStatus === 'HEALTHY' && '✅'}
          {health.systemStatus === 'DEGRADED' && '⚠️'}
          {health.systemStatus === 'OFFLINE' && '❌'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Active Clones */}
        <div className="bg-slate-800/50 rounded p-4">
          <p className="text-slate-400 text-xs mb-2">ACTIVE CLONES</p>
          <p className="text-2xl font-bold text-blue-400">
            {health.registry.activeClones}/{health.registry.totalClones}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Success rate: {health.registry.averageSuccessRate}
          </p>
        </div>

        {/* Healthy Coordinators */}
        <div className="bg-slate-800/50 rounded p-4">
          <p className="text-slate-400 text-xs mb-2">COORDINATOR HEALTH</p>
          <p className="text-2xl font-bold text-green-400">
            {health.coordinator.healthyClones}/{health.coordinator.healthyClones + health.coordinator.unhealthyClones}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Healthy
          </p>
        </div>

        {/* Circuit Breakers */}
        <div className="bg-slate-800/50 rounded p-4">
          <p className="text-slate-400 text-xs mb-2">CIRCUIT BREAKERS</p>
          <p className={`text-2xl font-bold ${health.coordinator.circuitBreakersOpen > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {health.coordinator.circuitBreakersOpen}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Open
          </p>
        </div>

        {/* Response Time */}
        <div className="bg-slate-800/50 rounded p-4">
          <p className="text-slate-400 text-xs mb-2">AVG RESPONSE TIME</p>
          <p className="text-2xl font-bold text-purple-400">
            {health.coordinator.avgResponseTime}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Average
          </p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="mt-6 pt-6 border-t border-slate-700">
        <p className="text-slate-400 text-xs mb-3">SYSTEM CAPABILITIES</p>
        <div className="flex flex-wrap gap-2">
          {health.capabilities.map((cap) => (
            <span
              key={cap}
              className="bg-slate-700/50 text-slate-300 text-xs px-3 py-1 rounded-full"
            >
              ✓ {cap.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <p className="text-slate-500 text-xs mt-4">
        Last updated: {new Date(health.timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
};

export default HealthCard;
