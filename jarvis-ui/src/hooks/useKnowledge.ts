/**
 * useKnowledge Hook — Knowledge Pipeline Integration
 *
 * Handles:
 * - Knowledge ingestion from URLs
 * - Semantic search with RAG
 * - Context augmentation for agent reasoning
 * - Ingestion job monitoring
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface IngestionJob {
  jobId: string;
  url: string;
  contentType: 'pdf' | 'video' | 'podcast' | 'article' | 'unknown';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  chunksProcessed: number;
  chunksStored: number;
  error?: string;
}

export interface SearchResult {
  title: string;
  source: 'pdf' | 'video' | 'podcast' | 'article' | 'web';
  similarity: string;
  content: string;
  url?: string;
}

export interface KnowledgeContext {
  query: string;
  confidence: number;
  resultsCount: number;
  results: SearchResult[];
  context: string;
}

export interface AugmentedContext {
  query: string;
  augmentedContext: string;
  sources: string[];
  sourceCount: number;
}

export const useKnowledge = (apiHost: string = `http://${window.location.hostname}:3000`) => {
  const [isIngesting, setIsIngesting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentJob, setCurrentJob] = useState<IngestionJob | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [knowledgeStats, setKnowledgeStats] = useState({
    totalChunks: 0,
    completedJobs: 0,
    failedJobs: 0,
  });

  const jobPollingRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start ingestion from URL
   */
  const ingestFromUrl = useCallback(
    async (url: string, title?: string): Promise<IngestionJob | null> => {
      setIsIngesting(true);
      const startTime = Date.now();

      try {
        const response = await fetch(`${apiHost}/api/knowledge/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, title }),
        });

        if (!response.ok) throw new Error('Ingestion failed');

        const data: any = await response.json();
        const job: IngestionJob = {
          jobId: data.data.jobId,
          url: data.data.url,
          contentType: data.data.contentType,
          status: data.data.status,
          progress: data.data.progress,
          chunksProcessed: 0,
          chunksStored: 0,
        };

        setCurrentJob(job);

        // Start polling for job status
        startJobPolling(job.jobId);

        console.log('[useKnowledge] Ingestion started', {
          jobId: job.jobId,
          contentType: job.contentType,
          duration: Date.now() - startTime,
        });

        return job;
      } catch (error) {
        console.error('[useKnowledge] Ingestion error:', error);
        return null;
      } finally {
        setIsIngesting(false);
      }
    },
    [apiHost]
  );

  /**
   * Poll for job status
   */
  const startJobPolling = useCallback(
    (jobId: string, interval: number = 1000) => {
      if (jobPollingRef.current) {
        clearInterval(jobPollingRef.current);
      }

      jobPollingRef.current = setInterval(async () => {
        try {
          const response = await fetch(`${apiHost}/api/knowledge/ingest/${jobId}`);

          if (!response.ok) return;

          const data: any = await response.json();
          const job: IngestionJob = {
            jobId: data.data.jobId,
            url: currentJob?.url || '',
            contentType: currentJob?.contentType || 'unknown',
            status: data.data.status,
            progress: data.data.progress,
            chunksProcessed: data.data.chunksProcessed,
            chunksStored: data.data.chunksStored,
            error: data.data.error,
          };

          setCurrentJob(job);

          // Stop polling when completed or failed
          if (job.status === 'completed' || job.status === 'failed') {
            if (jobPollingRef.current) {
              clearInterval(jobPollingRef.current);
            }
            console.log(`[useKnowledge] Job ${job.status}: ${jobId}`);
          }
        } catch (error) {
          console.error('[useKnowledge] Polling error:', error);
        }
      }, interval);
    },
    [apiHost, currentJob]
  );

  /**
   * Search knowledge base
   */
  const searchKnowledge = useCallback(
    async (
      query: string,
      mode: 'semantic' | 'keyword' | 'hybrid' = 'hybrid',
      topK: number = 5
    ): Promise<KnowledgeContext | null> => {
      setIsSearching(true);
      const startTime = Date.now();

      try {
        const response = await fetch(`${apiHost}/api/knowledge/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, mode, topK }),
        });

        if (!response.ok) throw new Error('Search failed');

        const data: any = await response.json();
        const context: KnowledgeContext = {
          query: data.data.query,
          confidence: data.data.confidence,
          resultsCount: data.data.resultsCount,
          results: data.data.results,
          context: data.data.context,
        };

        setSearchResults(context.results);

        console.log('[useKnowledge] Search completed', {
          query,
          resultsCount: context.resultsCount,
          confidence: context.confidence,
          duration: Date.now() - startTime,
        });

        return context;
      } catch (error) {
        console.error('[useKnowledge] Search error:', error);
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    [apiHost]
  );

  /**
   * Get RAG-augmented context for agent reasoning
   */
  const getAugmentedContext = useCallback(
    async (
      query: string,
      history?: { role: string; content: string }[],
      topK?: number
    ): Promise<AugmentedContext | null> => {
      try {
        const response = await fetch(`${apiHost}/api/knowledge/augment-context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, history: history || [], topK: topK || 3 }),
        });

        if (!response.ok) throw new Error('Augmentation failed');

        const data: any = await response.json();
        return data.data as AugmentedContext;
      } catch (error) {
        console.error('[useKnowledge] Augmented context error:', error);
        return null;
      }
    },
    [apiHost]
  );

  /**
   * Get knowledge statistics
   */
  const getStats = useCallback(async () => {
    try {
      const response = await fetch(`${apiHost}/api/knowledge/stats`);

      if (!response.ok) return;

      const data: any = await response.json();
      setKnowledgeStats({
        totalChunks: data.data.vectorStore.totalChunks,
        completedJobs: data.data.ingestion.completedJobs,
        failedJobs: data.data.ingestion.failedJobs,
      });
    } catch (error) {
      console.error('[useKnowledge] Stats error:', error);
    }
  }, [apiHost]);

  /**
   * Get system health
   */
  const getHealth = useCallback(async () => {
    try {
      const response = await fetch(`${apiHost}/api/knowledge/health`);

      if (!response.ok) return null;

      const data: any = await response.json();
      return data.data;
    } catch (error) {
      console.error('[useKnowledge] Health check error:', error);
      return null;
    }
  }, [apiHost]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (jobPollingRef.current) {
        clearInterval(jobPollingRef.current);
      }
    };
  }, []);

  return {
    // State
    isIngesting,
    isSearching,
    currentJob,
    searchResults,
    knowledgeStats,

    // Methods
    ingestFromUrl,
    searchKnowledge,
    getAugmentedContext,
    getStats,
    getHealth,
  };
};

export default useKnowledge;
