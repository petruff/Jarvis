/**
 * Mind Clone Service — Expert Agent Management & Inference
 *
 * Manages:
 * - Clone creation and activation
 * - Expert reasoning and decision-making
 * - Consensus reasoning with multiple experts
 * - Evidence-based justification
 */

// import ExpertExtractor from './expertExtractor'; // COMMENTED OUT: pdf-parse dependency
import { MindClone, MindCloneDNA, ExpertInsight, ConsensusDecision, ConsensusProfile, ExtractionConfig } from './types';
import { CloneRegistry } from './cloneRegistry';
import { ConsensusCoordinator } from './consensusCoordinator';
import { PerformanceOptimizer } from './performanceOptimizer';
import OpenAI from 'openai';
import crypto from 'crypto';
import { Pool } from 'pg';
import Redis from 'redis';

export class MindCloneService {
  private extractor: any; // COMMENTED OUT: ExpertExtractor - pdf-parse dependency
  private openai: OpenAI;
  private clones: Map<string, MindClone> = new Map();
  private registry: CloneRegistry | null = null;
  private coordinator: ConsensusCoordinator | null = null;
  private optimizer: PerformanceOptimizer | null = null;

  constructor(db?: Pool, cache?: Redis.RedisClient) {
    this.extractor = null; // COMMENTED OUT: new ExpertExtractor();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize distributed components if DB and cache are provided (Phase 5)
    if (db && cache) {
      this.registry = new CloneRegistry(db, cache);
      this.coordinator = new ConsensusCoordinator(this, cache);
      this.optimizer = new PerformanceOptimizer(cache);
    }
  }

  /**
   * Create a new mind clone from expert knowledge
   */
  async createMindClone(
    expertName: string,
    domain: string,
    sourceDocuments: string[],
    config: ExtractionConfig = {
      targetDomain: domain,
      extractPatterns: true,
      extractRules: true,
      extractBeliefs: true,
      minConfidence: 0.6,
      maxPatternsPerType: 10,
      useConversationContext: true,
    }
  ): Promise<MindClone> {
    console.log(`[MindCloneService] Creating mind clone: ${expertName} (${domain})`);

    try {
      // Extract expertise DNA from documents
      const dna = await this.extractor.extractExpertDNA(expertName, domain, config);

      // Create clone instance
      const clone: MindClone = {
        id: crypto.randomUUID(),
        cloneId: `${expertName.toLowerCase()}-${domain.toLowerCase()}`.replace(/\s/g, '-'),
        dna,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        sourceDocuments,
        extractionConfidence: 0.8, // Will be updated based on evidence
        activationCount: 0,
        successRate: 0.5, // Starts neutral
        metadata: {
          version: '1.0.0',
          extractedBy: 'expertExtractor',
          notes: `Cloned from ${sourceDocuments.length} documents`,
          tags: [domain, 'expert', 'active'],
        },
      };

      // Store clone
      this.clones.set(clone.id, clone);

      console.log(`[MindCloneService] Clone created: ${clone.cloneId}`);
      return clone;
    } catch (error) {
      console.error('[MindCloneService] Clone creation error:', error);
      throw new Error(`Failed to create mind clone: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Get expert insight from a single clone (with caching - Phase 5)
   */
  async getExpertInsight(cloneId: string, query: string): Promise<ExpertInsight | null> {
    const clone = this.clones.get(cloneId);
    if (!clone) return null;

    try {
      // Check cache first (Phase 5)
      if (this.optimizer) {
        const cached = await this.optimizer.getCachedInsight(cloneId, query);
        if (cached) {
          console.log(`[MindCloneService] Cache hit for ${clone.dna.expertName}`);
          return cached;
        }
      }

      // Deduplicate concurrent requests (Phase 5)
      const fetcher = async () => {
        // Prepare context from clone's knowledge
        const relevantRules = clone.dna.decisionRules.filter(
          (r) => query.toLowerCase().includes(r.condition.toLowerCase()) || query.toLowerCase().includes(r.action.toLowerCase())
        );

        const supportingEvidence = clone.dna.knowledgeBase.filter((e) =>
          query.toLowerCase().includes(e.claim.toLowerCase())
        );

        // Use LLM to generate expert reasoning
        const startTime = Date.now();
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `You are ${clone.dna.expertName}, an expert in ${clone.dna.domain}.
Your expertise:
- Decision style: ${clone.dna.decisionMakingStyle}
- Approach: ${clone.dna.problemSolvingApproach}
- Core beliefs: ${clone.dna.coreBeliefs.join(', ')}
- Known biases: ${clone.dna.biases.join(', ')}

Provide your expert analysis on the query.`,
            },
            {
              role: 'user',
              content: query,
            },
          ],
          max_tokens: 800,
          temperature: 0.7,
        });
        const duration = Date.now() - startTime;

        const insight: ExpertInsight = {
          cloneId,
          expertName: clone.dna.expertName,
          domain: clone.dna.domain,
          claim: response.choices[0].message.content || '',
          reasoning: `Analysis from ${clone.dna.decisionMakingStyle} perspective`,
          confidence: 0.7 + Math.random() * 0.25,
          relevantRules,
          supportingEvidence,
          uncertainties: clone.dna.blindSpots.slice(0, 3),
        };

        // Cache the insight (Phase 5)
        if (this.optimizer) {
          await this.optimizer.cacheInsight(cloneId, query, insight);
          this.optimizer.recordQueryTime(duration);
        }

        return insight;
      };

      const insight = this.optimizer
        ? await this.optimizer.deduplicateRequest(cloneId, query, fetcher)
        : await fetcher();

      clone.activationCount++;
      clone.updatedAt = Date.now();

      return insight;
    } catch (error) {
      console.error('[MindCloneService] Expert insight error:', error);
      return null;
    }
  }

  /**
   * Get consensus decision from multiple expert clones
   */
  async getConsensusDecision(
    query: string,
    cloneIds: string[],
    conflictResolution: 'majority' | 'consensus' | 'weighted' = 'weighted'
  ): Promise<ConsensusDecision | null> {
    try {
      // Get insights from all clones
      const insights = await Promise.all(
        cloneIds
          .map((id) => this.clones.get(id))
          .filter((c) => c !== undefined)
          .map((c) => this.getExpertInsight(c!.id, query))
      );

      const validInsights = insights.filter((i) => i !== null) as ExpertInsight[];

      if (validInsights.length === 0) {
        return null;
      }

      return await this.synthesizeConsensus(query, validInsights, conflictResolution);
    } catch (error) {
      console.error('[MindCloneService] Consensus decision error:', error);
      return null;
    }
  }

  /**
   * Synthesize consensus from collected insights (Phase 5 - Distributed)
   */
  async synthesizeConsensus(
    query: string,
    insights: ExpertInsight[],
    conflictResolution: 'majority' | 'consensus' | 'weighted' = 'weighted'
  ): Promise<ConsensusDecision> {
    const cloneIds = insights.map((i) => i.cloneId);

    // Use LLM to synthesize consensus
    const expertSummaries = insights
      .map((i) => `${i.expertName} (${i.domain}, confidence: ${(i.confidence * 100).toFixed(0)}%): ${i.claim}`)
      .join('\n\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a synthesis expert combining perspectives from multiple domain experts.
Review their insights and:
1. Identify common themes and areas of agreement
2. Note disagreements and conflicts
3. Recommend a synthesized decision
4. Rate confidence (0-1)
5. Explain any dissent
6. Suggest alternatives if major disagreement exists`,
        },
        {
          role: 'user',
          content: `Question: ${query}\n\nExpert perspectives (with confidence levels):\n${expertSummaries}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    // Calculate weighted confidence based on conflict resolution strategy
    let confidence = 0.75;
    if (conflictResolution === 'majority') {
      const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
      confidence = avgConfidence;
    } else if (conflictResolution === 'weighted') {
      // Weight by clone success rates
      const weightedSum = insights.reduce((sum, i) => {
        const clone = this.clones.get(i.cloneId);
        const weight = clone ? clone.successRate : 0.5;
        return sum + i.confidence * weight;
      }, 0);
      const weightSum = insights.reduce((sum, i) => {
        const clone = this.clones.get(i.cloneId);
        return sum + (clone ? clone.successRate : 0.5);
      }, 0);
      confidence = weightSum > 0 ? weightedSum / weightSum : 0.75;
    }

    const consensus: ConsensusDecision = {
      id: crypto.randomUUID(),
      query,
      timestamp: Date.now(),
      profile: {
        profileId: crypto.randomUUID(),
        cloneIds,
        domain: insights[0].domain,
        decisionWeights: Object.fromEntries(
          cloneIds.map((id) => {
            const clone = this.clones.get(id);
            return [id, clone ? clone.successRate : 0.5];
          })
        ),
        conflictResolution,
      },
      decision: response.choices[0].message.content || '',
      confidence: Math.min(1.0, Math.max(0, confidence)),
      evidence: insights.map((i) => ({
        cloneId: i.cloneId,
        claim: i.claim,
        support: i.confidence,
      })),
      reasoning: `Synthesized from ${insights.length} expert perspectives using ${conflictResolution} conflict resolution`,
      alternatives: [],
      dissent: [],
    };

    return consensus;
  }

  /**
   * Get distributed consensus using coordinator (Phase 5)
   */
  async getDistributedConsensus(
    query: string,
    domain?: string,
    minClones: number = 3,
    maxClones: number = 10
  ): Promise<ConsensusDecision | null> {
    if (!this.coordinator) {
      throw new Error('Distributed consensus requires coordinator initialization (Phase 5)');
    }

    try {
      return await this.coordinator.getDistributedConsensus({
        query,
        domain,
        minClones,
        maxClones,
        timeoutMs: 5000,
        conflictResolution: 'weighted',
      });
    } catch (error) {
      console.error('[MindCloneService] Distributed consensus error:', error);
      return null;
    }
  }

  /**
   * Get clone by ID
   */
  getClone(cloneId: string): MindClone | undefined {
    return this.clones.get(cloneId);
  }

  /**
   * List all clones
   */
  listClones(filterDomain?: string): MindClone[] {
    const clones = Array.from(this.clones.values());
    return filterDomain ? clones.filter((c) => c.dna.domain === filterDomain) : clones;
  }

  /**
   * Get clones by domain
   */
  getClonesByDomain(domain: string): MindClone[] {
    return Array.from(this.clones.values()).filter((c) => c.dna.domain === domain);
  }

  /**
   * Delete clone
   */
  deleteClone(cloneId: string): boolean {
    return this.clones.delete(cloneId);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalClones: number;
    clonesByDomain: Record<string, number>;
    totalActivations: number;
    averageSuccessRate: number;
  } {
    const clones = Array.from(this.clones.values());
    const clonesByDomain: Record<string, number> = {};
    let totalActivations = 0;
    let totalSuccessRate = 0;

    for (const clone of clones) {
      clonesByDomain[clone.dna.domain] = (clonesByDomain[clone.dna.domain] || 0) + 1;
      totalActivations += clone.activationCount;
      totalSuccessRate += clone.successRate;
    }

    return {
      totalClones: clones.length,
      clonesByDomain,
      totalActivations,
      averageSuccessRate: clones.length > 0 ? totalSuccessRate / clones.length : 0,
    };
  }
}

export default MindCloneService;
