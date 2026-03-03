/**
 * useDistributedClones Hook — Phase 5 API Integration
 *
 * Handles:
 * - Clone registry management
 * - Distributed consensus queries
 * - Performance metrics retrieval
 * - Version history and rollback
 * - Real-time health monitoring
 */

import { useState, useCallback, useEffect } from 'react';

export interface Clone {
  id: string;
  expertName: string;
  domain: string;
  version: number;
  status: 'active' | 'archived' | 'deprecated';
  successRate: number;
  activationCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConsensusResult {
  id: string;
  query: string;
  decision: string;
  reasoning: string;
  confidence: string;
  expertsConsulted: number;
  conflictResolution: string;
  evidenceItems: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  caching: {
    hitRate: string;
    cacheHits: number;
    cacheMisses: number;
  };
  performance: {
    avgQueryTime: string;
    batchProcessed: number;
    deduplicatedRequests: number;
  };
  loadMetrics: Array<{
    cloneId: string;
    responseTime: string;
    successRate: string;
    lastUsed: string;
  }>;
}

export interface RegistryStats {
  registry: {
    totalClones: number;
    activeClones: number;
    clonesByDomain: Record<string, number>;
    averageSuccessRate: string;
    topClones: Clone[];
  };
  coordinator: {
    healthy: number;
    unhealthy: number;
    circuitBreakerOpen: number;
    avgResponseTime: string;
  };
  metrics: PerformanceMetrics;
}

export interface SystemHealth {
  systemStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  timestamp: string;
  registry: {
    totalClones: number;
    activeClones: number;
    averageSuccessRate: string;
  };
  coordinator: {
    healthyClones: number;
    unhealthyClones: number;
    circuitBreakersOpen: number;
    avgResponseTime: string;
  };
  performance: {
    cacheHitRate: string;
    avgQueryTime: string;
  };
  capabilities: string[];
}

export const useDistributedClones = (
  apiHost: string = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000`
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  const [registryStats, setRegistryStats] = useState<RegistryStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get distributed consensus from multiple clones
   */
  const getDistributedConsensus = useCallback(
    async (
      query: string,
      domain?: string,
      minClones: number = 3,
      maxClones: number = 10
    ): Promise<ConsensusResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiHost}/api/mindclones/distributed/consensus`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, domain, minClones, maxClones }),
        });

        if (!response.ok) throw new Error('Consensus generation failed');

        const data = (await response.json()) as any;
        const result: ConsensusResult = {
          id: data.data.id,
          query: data.data.query,
          decision: data.data.decision,
          reasoning: data.data.reasoning,
          confidence: data.data.confidence,
          expertsConsulted: data.data.expertsConsulted,
          conflictResolution: data.data.conflictResolution,
          evidenceItems: data.data.evidenceItems,
          timestamp: data.data.timestamp,
        };

        setConsensus(result);
        console.log('[useDistributedClones] Consensus received:', result.id);

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useDistributedClones] Consensus error:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apiHost]
  );

  /**
   * Get registry statistics
   */
  const getRegistryStats = useCallback(async (): Promise<RegistryStats | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiHost}/api/mindclones/distributed/registry`);

      if (!response.ok) {
        setError('Failed to fetch registry stats');
        return null;
      }

      const data = (await response.json()) as any;
      setRegistryStats(data.data);
      console.log('[useDistributedClones] Registry stats:', data.data.registry.totalClones);

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useDistributedClones] Registry stats error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiHost]);

  /**
   * Get performance metrics
   */
  const getPerformanceMetrics = useCallback(async (): Promise<PerformanceMetrics | null> => {
    try {
      const response = await fetch(`${apiHost}/api/mindclones/distributed/performance`);

      if (!response.ok) {
        setError('Failed to fetch performance metrics');
        return null;
      }

      const data = (await response.json()) as any;
      setPerformanceMetrics(data.data);
      console.log('[useDistributedClones] Performance metrics:', data.data.caching.hitRate);

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useDistributedClones] Performance metrics error:', err);
      return null;
    }
  }, [apiHost]);

  /**
   * Get system health status
   */
  const getSystemHealth = useCallback(async (): Promise<SystemHealth | null> => {
    try {
      const response = await fetch(`${apiHost}/api/mindclones/distributed/health`);

      if (!response.ok) {
        setError('Failed to fetch system health');
        return null;
      }

      const data = (await response.json()) as any;
      setSystemHealth(data.data);
      console.log('[useDistributedClones] System health:', data.data.systemStatus);

      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useDistributedClones] System health error:', err);
      return null;
    }
  }, [apiHost]);

  /**
   * Get version history for clone
   */
  const getVersionHistory = useCallback(
    async (cloneId: string) => {
      try {
        const response = await fetch(
          `${apiHost}/api/mindclones/distributed/versions/${cloneId}`
        );

        if (!response.ok) throw new Error('Failed to fetch version history');

        const data = (await response.json()) as any;
        console.log('[useDistributedClones] Version history:', data.data.versionCount);

        return data.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useDistributedClones] Version history error:', err);
        return null;
      }
    },
    [apiHost]
  );

  /**
   * Rollback clone to previous version
   */
  const rollbackClone = useCallback(
    async (cloneId: string, version: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${apiHost}/api/mindclones/distributed/rollback/${cloneId}/${version}`,
          { method: 'POST' }
        );

        if (!response.ok) throw new Error('Rollback failed');

        console.log(`[useDistributedClones] Rolled back ${cloneId} to v${version}`);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useDistributedClones] Rollback error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [apiHost]
  );

  /**
   * Archive clone
   */
  const archiveClone = useCallback(
    async (cloneId: string, reason: string = ''): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${apiHost}/api/mindclones/distributed/archive/${cloneId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
          }
        );

        if (!response.ok) throw new Error('Archive failed');

        console.log(`[useDistributedClones] Archived ${cloneId}`);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useDistributedClones] Archive error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [apiHost]
  );

  /**
   * Start polling for real-time health updates
   */
  useEffect(() => {
    const pollInterval = setInterval(() => {
      getSystemHealth();
      getPerformanceMetrics();
    }, 5000); // Poll every 5 seconds

    // Initial fetch
    getSystemHealth();
    getPerformanceMetrics();

    return () => clearInterval(pollInterval);
  }, [getSystemHealth, getPerformanceMetrics]);

  return {
    // State
    isLoading,
    error,
    consensus,
    registryStats,
    performanceMetrics,
    systemHealth,

    // Methods
    getDistributedConsensus,
    getRegistryStats,
    getPerformanceMetrics,
    getSystemHealth,
    getVersionHistory,
    rollbackClone,
    archiveClone,
  };
};

export default useDistributedClones;
