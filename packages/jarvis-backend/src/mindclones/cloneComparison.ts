/**
 * Clone Comparison Engine — Phase 7 Enterprise Feature
 *
 * Capabilities:
 * - Side-by-side reasoning comparison
 * - Similarity analysis between clones
 * - Performance metrics comparison
 * - Decision divergence tracking
 * - Consensus quality metrics
 */

import { MindClone, ExpertInsight } from './types';

export interface ComparisonMetrics {
  cloneId1: string;
  cloneId2: string;
  reasoningSimilarity: number; // 0-1
  confidenceDelta: number; // difference in confidence
  decisionAlignment: number; // 0-1, how much they agree
  performanceDelta: {
    successRateDiff: number;
    activationRatioDiff: number;
  };
}

export interface CloneComparison {
  comparisonId: string;
  timestamp: number;
  clones: {
    clone1: MindClone;
    clone2: MindClone;
  };
  insights: {
    insight1: ExpertInsight;
    insight2: ExpertInsight;
  };
  metrics: ComparisonMetrics;
  analysis: {
    strengths1: string[];
    strengths2: string[];
    weaknesses1: string[];
    weaknesses2: string[];
    recommendations: string;
  };
}

export interface CloneComparisonRequest {
  cloneId1: string;
  cloneId2: string;
  query: string;
}

export class CloneComparison {
  /**
   * Compare two clones side-by-side
   */
  static async compareClones(
    clone1: MindClone,
    clone2: MindClone,
    insight1: ExpertInsight,
    insight2: ExpertInsight
  ): Promise<ComparisonMetrics> {
    // Calculate reasoning similarity (0-1)
    const reasoningSimilarity = this.calculateSimilarity(
      insight1.reasoning,
      insight2.reasoning
    );

    // Calculate confidence delta
    const confidenceDelta = Math.abs(insight1.confidence - insight2.confidence);

    // Calculate decision alignment
    const decisionAlignment = this.calculateDecisionAlignment(
      insight1.claim,
      insight2.claim
    );

    // Performance comparison
    const performanceDelta = {
      successRateDiff: Math.abs(clone1.successRate - clone2.successRate),
      activationRatioDiff: Math.abs(
        clone1.activationCount / Math.max(1, clone1.activationCount) -
          clone2.activationCount / Math.max(1, clone2.activationCount)
      ),
    };

    return {
      cloneId1: clone1.id,
      cloneId2: clone2.id,
      reasoningSimilarity,
      confidenceDelta,
      decisionAlignment,
      performanceDelta,
    };
  }

  /**
   * Calculate string similarity (cosine similarity)
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Calculate decision alignment (how much insights agree)
   */
  private static calculateDecisionAlignment(claim1: string, claim2: string): number {
    const similarity = this.calculateSimilarity(claim1, claim2);
    // If insights are similar, they're aligned
    // If very different, they're divergent
    return similarity > 0.7 ? 1.0 : similarity > 0.4 ? 0.5 : 0.0;
  }

  /**
   * Generate comparison analysis
   */
  static generateAnalysis(
    clone1: MindClone,
    clone2: MindClone,
    metrics: ComparisonMetrics
  ): {
    strengths1: string[];
    strengths2: string[];
    weaknesses1: string[];
    weaknesses2: string[];
    recommendations: string;
  } {
    const strengths1: string[] = [];
    const strengths2: string[] = [];
    const weaknesses1: string[] = [];
    const weaknesses2: string[] = [];

    // Analyze clone 1
    if (clone1.successRate > clone2.successRate) {
      strengths1.push(
        `Higher success rate: ${(clone1.successRate * 100).toFixed(1)}% vs ${(clone2.successRate * 100).toFixed(1)}%`
      );
    } else if (clone1.successRate < clone2.successRate) {
      weaknesses1.push(
        `Lower success rate: ${(clone1.successRate * 100).toFixed(1)}% vs ${(clone2.successRate * 100).toFixed(1)}%`
      );
    }

    if (clone1.activationCount > clone2.activationCount) {
      strengths1.push(`More activated: ${clone1.activationCount} uses`);
    }

    // Analyze clone 2
    if (clone2.successRate > clone1.successRate) {
      strengths2.push(
        `Higher success rate: ${(clone2.successRate * 100).toFixed(1)}% vs ${(clone1.successRate * 100).toFixed(1)}%`
      );
    } else if (clone2.successRate < clone1.successRate) {
      weaknesses2.push(
        `Lower success rate: ${(clone2.successRate * 100).toFixed(1)}% vs ${(clone1.successRate * 100).toFixed(1)}%`
      );
    }

    if (clone2.activationCount > clone1.activationCount) {
      strengths2.push(`More activated: ${clone2.activationCount} uses`);
    }

    // Generate recommendation
    let recommendations = '';
    if (metrics.decisionAlignment < 0.5) {
      recommendations =
        'Clones have divergent reasoning. Consider using both in consensus to capture different perspectives.';
    } else if (metrics.reasoningSimilarity > 0.8) {
      recommendations = 'Clones have very similar reasoning patterns. One could potentially be archived.';
    } else {
      recommendations = 'Clones complement each other well with balanced perspectives.';
    }

    return {
      strengths1,
      strengths2,
      weaknesses1,
      weaknesses2,
      recommendations,
    };
  }
}

export default CloneComparison;
