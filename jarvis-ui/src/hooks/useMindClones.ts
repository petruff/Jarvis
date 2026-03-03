/**
 * useMindClones Hook — Expert Agent Integration
 *
 * Handles:
 * - Mind clone creation and management
 * - Expert insight retrieval
 * - Consensus reasoning
 * - Clone statistics
 */

import { useState, useCallback } from 'react';

export interface MindClone {
  cloneId: string;
  expertName: string;
  domain: string;
  expertiseLevel: 'novice' | 'intermediate' | 'expert' | 'master';
  patterns: number;
  rules: number;
}

export interface ExpertInsight {
  expertName: string;
  domain: string;
  query: string;
  reasoning: string;
  confidence: string;
  relevantRules: number;
  supportingEvidence: number;
  uncertainties: string[];
}

export interface ConsensusDecision {
  query: string;
  decision: string;
  reasoning: string;
  confidence: string;
  expertsConsulted: number;
  conflictResolution: string;
  evidenceItems: number;
}

export const useMindClones = (apiHost: string = `http://${window.location.hostname}:3000`) => {
  const [isCreating, setIsCreating] = useState(false);
  const [clones, setClones] = useState<MindClone[]>([]);
  const [insight, setInsight] = useState<ExpertInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Create a new mind clone
   */
  const createClone = useCallback(
    async (expertName: string, domain: string, sourceDocuments: string[] = []): Promise<MindClone | null> => {
      setIsCreating(true);

      try {
        const response = await fetch(`${apiHost}/api/mindclones/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expertName, domain, sourceDocuments }),
        });

        if (!response.ok) throw new Error('Clone creation failed');

        const data: any = await response.json();
        const clone: MindClone = {
          cloneId: data.data.cloneId,
          expertName: data.data.expertName,
          domain: data.data.domain,
          expertiseLevel: data.data.expertiseLevel,
          patterns: data.data.patterns,
          rules: data.data.rules,
        };

        setClones((prev) => [...prev, clone]);
        console.log('[useMindClones] Clone created:', clone.cloneId);

        return clone;
      } catch (error) {
        console.error('[useMindClones] Clone creation error:', error);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [apiHost]
  );

  /**
   * List all clones
   */
  const listClones = useCallback(
    async (domain?: string): Promise<MindClone[]> => {
      try {
        const url = domain ? `${apiHost}/api/mindclones?domain=${domain}` : `${apiHost}/api/mindclones`;
        const response = await fetch(url);

        if (!response.ok) return [];

        const data: any = await response.json();
        setClones(data.data.clones);
        return data.data.clones;
      } catch (error) {
        console.error('[useMindClones] List error:', error);
        return [];
      }
    },
    [apiHost]
  );

  /**
   * Get expert insight from a clone
   */
  const getExpertInsight = useCallback(
    async (cloneId: string, query: string): Promise<ExpertInsight | null> => {
      setIsLoading(true);

      try {
        const response = await fetch(`${apiHost}/api/mindclones/${cloneId}/insight`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) throw new Error('Insight generation failed');

        const data: any = await response.json();
        const expertInsight: ExpertInsight = {
          expertName: data.data.expertName,
          domain: data.data.domain,
          query: data.data.query,
          reasoning: data.data.reasoning,
          confidence: data.data.confidence,
          relevantRules: data.data.relevantRules,
          supportingEvidence: data.data.supportingEvidence,
          uncertainties: data.data.uncertainties,
        };

        setInsight(expertInsight);
        console.log('[useMindClones] Expert insight received:', expertInsight.expertName);

        return expertInsight;
      } catch (error) {
        console.error('[useMindClones] Expert insight error:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apiHost]
  );

  /**
   * Get consensus decision from multiple clones
   */
  const getConsensusDecision = useCallback(
    async (
      query: string,
      cloneIds: string[],
      conflictResolution: 'majority' | 'consensus' | 'weighted' = 'weighted'
    ): Promise<ConsensusDecision | null> => {
      setIsLoading(true);

      try {
        const response = await fetch(`${apiHost}/api/mindclones/consensus`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, cloneIds, conflictResolution }),
        });

        if (!response.ok) throw new Error('Consensus generation failed');

        const data: any = await response.json();
        return data.data as ConsensusDecision;
      } catch (error) {
        console.error('[useMindClones] Consensus error:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apiHost]
  );

  /**
   * Get system statistics
   */
  const getStats = useCallback(async () => {
    try {
      const response = await fetch(`${apiHost}/api/mindclones/stats`);

      if (!response.ok) return null;

      const data: any = await response.json();
      return data.data;
    } catch (error) {
      console.error('[useMindClones] Stats error:', error);
      return null;
    }
  }, [apiHost]);

  /**
   * Delete a clone
   */
  const deleteClone = useCallback(
    async (cloneId: string): Promise<boolean> => {
      try {
        const response = await fetch(`${apiHost}/api/mindclones/${cloneId}`, {
          method: 'DELETE',
        });

        if (!response.ok) return false;

        setClones((prev) => prev.filter((c) => c.cloneId !== cloneId));
        return true;
      } catch (error) {
        console.error('[useMindClones] Delete error:', error);
        return false;
      }
    },
    [apiHost]
  );

  return {
    // State
    isCreating,
    isLoading,
    clones,
    insight,

    // Methods
    createClone,
    listClones,
    getExpertInsight,
    getConsensusDecision,
    getStats,
    deleteClone,
  };
};

export default useMindClones;
