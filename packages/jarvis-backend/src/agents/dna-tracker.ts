/**
 * DNA Tracker — Phase 3.2
 *
 * Tracks agent DNA variant usage and performance:
 * - Records which DNA variant was used per mission
 * - Calculates performance metrics per variant
 * - Generates mutation recommendations based on analysis
 * - Tracks mutation history and impact
 */

import * as fs from 'fs';
import * as path from 'path';
import { agentRegistry } from './registry';
import { metricsCollector } from '../instrumentation/metricsCollector';

export interface DNAVariant {
  agentId: string;
  dnaValue: string;
  firstUsedAt: string;
  lastUsedAt: string;
  missionCount: number;
  successCount: number;
  failureCount: number;
  averageQuality: number;
  averageLatency: number;
  confidenceScores: number[];
  routingAccuracy: number;
  source: 'initial' | 'mutation' | 'genesis';
  parentDNA?: string;
  mutationReason?: string;
}

export interface DNAPerformanceMetrics {
  agentId: string;
  variantId: string;
  successRate: number; // 0-100
  qualityScore: number; // 0-100
  latency: number; // ms
  reliability: number; // 0-100
  trend: 'improving' | 'stable' | 'degrading';
  recommendations: string[];
}

export interface MutationCandidate {
  agentId: string;
  currentDNA: string;
  suggestedChange: string;
  impactScore: number; // 0-100, likelihood of improvement
  reason: string;
  expectedBenefit: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export class DNATracker {
  private trackerPath: string;
  private variantMap: Map<string, DNAVariant> = new Map();

  constructor() {
    const dataDir = path.resolve(process.cwd(), '.jarvis');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.trackerPath = path.join(dataDir, 'dna-variants.json');
    this.load();
  }

  /**
   * Load DNA variants from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.trackerPath)) {
        const data = JSON.parse(fs.readFileSync(this.trackerPath, 'utf-8'));
        const variants = data.variants || [];
        for (const variant of variants) {
          const key = `${variant.agentId}:${variant.dnaValue.substring(0, 20)}`;
          this.variantMap.set(key, variant);
        }
        console.log(`[DNA_TRACKER] Loaded ${variants.length} DNA variants`);
      }
    } catch (err: any) {
      console.error(`[DNA_TRACKER] Failed to load variants: ${err.message}`);
    }
  }

  /**
   * Save DNA variants to disk
   */
  private save(): void {
    try {
      const variants = Array.from(this.variantMap.values());
      const data = {
        variants,
        lastUpdated: new Date().toISOString(),
        totalTracked: variants.length,
        agentsTracked: new Set(variants.map(v => v.agentId)).size
      };
      fs.writeFileSync(this.trackerPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error(`[DNA_TRACKER] Failed to save variants: ${err.message}`);
    }
  }

  /**
   * Record a DNA variant being used in a mission
   */
  recordUsage(
    agentId: string,
    dnaValue: string,
    success: boolean,
    qualityScore: number,
    latencyMs: number,
    confidence: number,
    routingAccuracy: number
  ): void {
    const key = `${agentId}:${dnaValue.substring(0, 20)}`;
    let variant = this.variantMap.get(key);

    if (!variant) {
      const agent = agentRegistry.getAgent(agentId);
      variant = {
        agentId,
        dnaValue,
        firstUsedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        missionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageQuality: 0,
        averageLatency: 0,
        confidenceScores: [],
        routingAccuracy: 0,
        source: 'initial' // Could be 'mutation' or 'genesis'
      };
    }

    // Update variant with new mission data
    variant.lastUsedAt = new Date().toISOString();
    variant.missionCount++;
    if (success) {
      variant.successCount++;
    } else {
      variant.failureCount++;
    }

    // Update running averages
    const totalWeight = variant.missionCount;
    variant.averageQuality = (variant.averageQuality * (totalWeight - 1) + qualityScore) / totalWeight;
    variant.averageLatency = (variant.averageLatency * (totalWeight - 1) + latencyMs) / totalWeight;
    variant.confidenceScores.push(confidence);
    variant.routingAccuracy = (variant.routingAccuracy * (totalWeight - 1) + routingAccuracy) / totalWeight;

    // Keep confidence scores manageable (last 100)
    if (variant.confidenceScores.length > 100) {
      variant.confidenceScores.shift();
    }

    this.variantMap.set(key, variant);

    // Emit metrics
    metricsCollector.recordDNAVariantUsage?.(agentId, qualityScore, success ? 'success' : 'failure');
  }

  /**
   * Get performance metrics for a DNA variant
   */
  getVariantMetrics(agentId: string, dnaValue: string): DNAPerformanceMetrics | null {
    const key = `${agentId}:${dnaValue.substring(0, 20)}`;
    const variant = this.variantMap.get(key);

    if (!variant || variant.missionCount === 0) {
      return null;
    }

    const successRate = (variant.successCount / variant.missionCount) * 100;
    const recentConfidence = variant.confidenceScores.slice(-20);
    const avgConfidence = recentConfidence.length > 0
      ? recentConfidence.reduce((a, b) => a + b, 0) / recentConfidence.length
      : 0;

    // Calculate trend (compare first 20% vs last 20% of missions)
    const firstChunk = Math.max(1, Math.floor(variant.missionCount * 0.2));
    const oldSuccessRate = (variant.successCount * 0.5) / firstChunk;
    const newSuccessRate = (variant.successCount * 0.5) / (variant.missionCount - firstChunk);

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (newSuccessRate > oldSuccessRate + 10) trend = 'improving';
    else if (newSuccessRate < oldSuccessRate - 10) trend = 'degrading';

    const recommendations: string[] = [];
    if (successRate < 75) {
      recommendations.push('Success rate below 75% — consider mutation');
    }
    if (variant.averageLatency > 5000) {
      recommendations.push('Latency exceeding 5s — optimize execution');
    }
    if (avgConfidence < 70) {
      recommendations.push('Confidence low — review decision-making');
    }
    if (trend === 'degrading') {
      recommendations.push('Performance degrading — investigate recent changes');
    }

    return {
      agentId,
      variantId: key,
      successRate,
      qualityScore: variant.averageQuality,
      latency: variant.averageLatency,
      reliability: Math.min(100, (variant.successCount / Math.max(1, variant.missionCount)) * 100 + avgConfidence),
      trend,
      recommendations
    };
  }

  /**
   * Get all DNA variants for an agent
   */
  getAgentVariants(agentId: string): DNAVariant[] {
    return Array.from(this.variantMap.values()).filter(v => v.agentId === agentId);
  }

  /**
   * Analyze performance across all variants of an agent
   */
  analyzeAgentDNA(agentId: string): {
    bestVariant: DNAVariant | null;
    performanceSpread: number;
    recommendMutation: boolean;
    allVariants: DNAPerformanceMetrics[];
  } {
    const variants = this.getAgentVariants(agentId);
    if (variants.length === 0) {
      return {
        bestVariant: null,
        performanceSpread: 0,
        recommendMutation: false,
        allVariants: []
      };
    }

    const metrics = variants.map(v => this.getVariantMetrics(agentId, v.dnaValue)).filter(Boolean) as DNAPerformanceMetrics[];

    if (metrics.length === 0) {
      return {
        bestVariant: null,
        performanceSpread: 0,
        recommendMutation: false,
        allVariants: []
      };
    }

    const best = metrics.reduce((prev, curr) =>
      curr.qualityScore > prev.qualityScore ? curr : prev
    );
    const worst = metrics.reduce((prev, curr) =>
      curr.qualityScore < prev.qualityScore ? curr : prev
    );

    const performanceSpread = best.qualityScore - worst.qualityScore;
    const recommendMutation = best.qualityScore < 80 || performanceSpread > 20;

    const bestVariant = variants.find(v =>
      `${v.agentId}:${v.dnaValue.substring(0, 20)}` === best.variantId
    ) || null;

    return {
      bestVariant,
      performanceSpread,
      recommendMutation,
      allVariants: metrics
    };
  }

  /**
   * Generate mutation candidates based on performance analysis
   */
  generateMutationCandidates(agentId: string): MutationCandidate[] {
    const analysis = this.analyzeAgentDNA(agentId);
    const candidates: MutationCandidate[] = [];

    if (!analysis.bestVariant || !analysis.recommendMutation) {
      return candidates;
    }

    // If best variant still has low quality, suggest mutations
    if (analysis.bestVariant.averageQuality < 75) {
      candidates.push({
        agentId,
        currentDNA: analysis.bestVariant.dnaValue,
        suggestedChange: this.suggestDNAChange(agentId, analysis.bestVariant, 'clarity'),
        impactScore: 65,
        reason: 'Low average quality score suggests voice/clarity issues',
        expectedBenefit: 'Improve communication clarity and response precision',
        riskLevel: 'low'
      });
    }

    // If high variance between variants, suggest specialization
    if (analysis.performanceSpread > 25) {
      candidates.push({
        agentId,
        currentDNA: analysis.bestVariant.dnaValue,
        suggestedChange: this.suggestDNAChange(agentId, analysis.bestVariant, 'focus'),
        impactScore: 55,
        reason: 'High variance between DNA variants indicates unfocused specialization',
        expectedBenefit: 'Increase focus and reduce role ambiguity',
        riskLevel: 'medium'
      });
    }

    // If latency high, suggest efficiency
    if (analysis.bestVariant.averageLatency > 3000) {
      candidates.push({
        agentId,
        currentDNA: analysis.bestVariant.dnaValue,
        suggestedChange: this.suggestDNAChange(agentId, analysis.bestVariant, 'efficiency'),
        impactScore: 45,
        reason: 'Latency exceeding 3s indicates potential inefficiency',
        expectedBenefit: 'Streamline execution and reduce response time',
        riskLevel: 'medium'
      });
    }

    return candidates.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Suggest specific DNA changes based on performance issue
   */
  private suggestDNAChange(
    agentId: string,
    variant: DNAVariant,
    issueType: 'clarity' | 'focus' | 'efficiency'
  ): string {
    const agent = agentRegistry.getAgent(agentId);
    if (!agent) return variant.dnaValue;

    // Simple suggestion templates based on issue type
    const suggestions: Record<string, string> = {
      clarity: `${variant.dnaValue.substring(0, 50)}... Focus on clear, concise responses. Avoid ambiguity. Prioritize actionability.`,
      focus: `${variant.dnaValue.substring(0, 30)}... Specialize exclusively in [core responsibility]. Delegate other tasks. Become a master of one domain.`,
      efficiency: `${variant.dnaValue.substring(0, 40)}... Execute rapidly with minimal overhead. Streamline reasoning. Prioritize speed without sacrificing quality.`
    };

    return suggestions[issueType];
  }

  /**
   * Record a mutation being applied
   */
  recordMutationApplied(
    agentId: string,
    oldDNA: string,
    newDNA: string,
    reason: string
  ): void {
    // Mark old variant as parent
    const oldKey = `${agentId}:${oldDNA.substring(0, 20)}`;
    const oldVariant = this.variantMap.get(oldKey);
    if (oldVariant) {
      oldVariant.mutationReason = reason;
    }

    // Create new variant entry
    const newKey = `${agentId}:${newDNA.substring(0, 20)}`;
    const newVariant: DNAVariant = {
      agentId,
      dnaValue: newDNA,
      firstUsedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      missionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageQuality: 0,
      averageLatency: 0,
      confidenceScores: [],
      routingAccuracy: 0,
      source: 'mutation',
      parentDNA: oldDNA,
      mutationReason: reason
    };

    this.variantMap.set(newKey, newVariant);
    this.save();

    console.log(`[DNA_TRACKER] Recorded mutation: ${agentId} (reason: ${reason})`);
  }

  /**
   * Get DNA variant history for an agent
   */
  getVariantHistory(agentId: string): Array<{
    variant: DNAVariant;
    metrics: DNAPerformanceMetrics | null;
  }> {
    return this.getAgentVariants(agentId)
      .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
      .map(variant => ({
        variant,
        metrics: this.getVariantMetrics(agentId, variant.dnaValue)
      }));
  }

  /**
   * Get summary for all agents
   */
  getSummary(): {
    totalAgentsTracked: number;
    totalVariantsTracked: number;
    averageQuality: number;
    agentsNeedingMutation: string[];
  } {
    const agents = new Set(Array.from(this.variantMap.values()).map(v => v.agentId));
    const allVariants = Array.from(this.variantMap.values());
    const qualityScores = allVariants.map(v => v.averageQuality).filter(q => q > 0);
    const avgQuality = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;

    const agentsNeedingMutation: string[] = [];
    for (const agentId of agents) {
      const analysis = this.analyzeAgentDNA(agentId as string);
      if (analysis.recommendMutation && analysis.bestVariant && analysis.bestVariant.averageQuality < 80) {
        agentsNeedingMutation.push(agentId as string);
      }
    }

    return {
      totalAgentsTracked: agents.size,
      totalVariantsTracked: allVariants.length,
      averageQuality: avgQuality,
      agentsNeedingMutation
    };
  }

  /**
   * Clear history for testing
   */
  clearHistory(): void {
    this.variantMap.clear();
    try {
      if (fs.existsSync(this.trackerPath)) {
        fs.unlinkSync(this.trackerPath);
      }
    } catch (err) {
      // Ignore
    }
  }
}

// Singleton instance
export const dnaTracker = new DNATracker();
