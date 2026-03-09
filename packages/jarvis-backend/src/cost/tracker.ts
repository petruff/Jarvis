/**
 * Cost Tracker — Phase 3.4
 *
 * Tracks operational costs across all systems:
 * - LLM API costs (DeepSeek, Gemini, Kimi)
 * - Embedding costs (OpenAI)
 * - Database operation costs
 * - Memory system costs
 * - Compute costs (OODA, consciousness, ReAct)
 * - Cost optimization recommendations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CostEntry {
  timestamp: string;
  category: 'llm' | 'embedding' | 'database' | 'memory' | 'compute' | 'other';
  operation: string;
  costUSD: number;
  metadata: Record<string, any>;
}

export interface CostBreakdown {
  llm: number;
  embedding: number;
  database: number;
  memory: number;
  compute: number;
  other: number;
  total: number;
}

export interface OptimizationRecommendation {
  id: string;
  category: string;
  issue: string;
  recommendation: string;
  estimatedSavings: number; // USD per day
  implementation: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
}

export class CostTracker {
  private costs: CostEntry[] = [];
  private costFilePath: string;

  constructor() {
    const dataDir = path.resolve(process.cwd(), '.jarvis');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.costFilePath = path.join(dataDir, 'costs.jsonl');
    this.load();
  }

  /**
   * Load cost history from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.costFilePath)) {
        const content = fs.readFileSync(this.costFilePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            this.costs.push(entry);
          } catch (e) {
            // Skip malformed lines
          }
        }
        console.log(`[COST_TRACKER] Loaded ${this.costs.length} cost entries`);
      }
    } catch (err: any) {
      console.error(`[COST_TRACKER] Failed to load costs: ${err.message}`);
    }
  }

  /**
   * Record a cost event
   */
  recordCost(
    category: CostEntry['category'],
    operation: string,
    costUSD: number,
    metadata?: Record<string, any>
  ): void {
    const entry: CostEntry = {
      timestamp: new Date().toISOString(),
      category,
      operation,
      costUSD,
      metadata: metadata || {}
    };

    this.costs.push(entry);

    // Append to file
    try {
      fs.appendFileSync(this.costFilePath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
      console.warn(`[COST_TRACKER] Failed to persist cost: ${err}`);
    }

    // Keep in-memory history manageable (last 10000)
    if (this.costs.length > 10000) {
      this.costs.shift();
    }
  }

  /**
   * Get cost breakdown for a time period
   */
  getCostBreakdown(hoursBack: number = 24): CostBreakdown {
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
    const recent = this.costs.filter(c => new Date(c.timestamp).getTime() > cutoff);

    const breakdown: CostBreakdown = {
      llm: 0,
      embedding: 0,
      database: 0,
      memory: 0,
      compute: 0,
      other: 0,
      total: 0
    };

    for (const cost of recent) {
      breakdown[cost.category] += cost.costUSD;
    }

    breakdown.total = Object.values(breakdown).reduce((a, b) => a + b, 0) - breakdown.total;

    return breakdown;
  }

  /**
   * Get costs per category for reporting
   */
  getDetailedBreakdown(hoursBack: number = 24): Record<string, any> {
    const breakdown = this.getCostBreakdown(hoursBack);
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
    const recent = this.costs.filter(c => new Date(c.timestamp).getTime() > cutoff);

    // Count operations
    const operationCounts: Record<string, number> = {};
    for (const cost of recent) {
      operationCounts[cost.operation] = (operationCounts[cost.operation] || 0) + 1;
    }

    return {
      timeframe: `${hoursBack}h`,
      breakdown,
      costPerCategory: breakdown,
      operationCounts,
      estimatedDailyBurn: (breakdown.total / hoursBack) * 24,
      estimatedMonthlyCost: ((breakdown.total / hoursBack) * 24 * 30)
    };
  }

  /**
   * Identify cost optimization opportunities
   */
  generateRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const breakdown = this.getCostBreakdown(24);
    const totalDaily = breakdown.total * 24 / 24; // Already daily

    // 1. LLM Cost Analysis
    if (breakdown.llm > totalDaily * 0.5) {
      recommendations.push({
        id: 'llm-reduce-context',
        category: 'LLM',
        issue: 'LLM costs are high, suggesting large context windows or frequent queries',
        recommendation: 'Implement prompt caching, reduce context window, use faster models for simple tasks',
        estimatedSavings: breakdown.llm * 0.3,
        implementation: 'high',
        priority: 'high'
      });
    }

    // 2. Embedding Cost Analysis
    if (breakdown.embedding > totalDaily * 0.2) {
      recommendations.push({
        id: 'embedding-optimize',
        category: 'Embedding',
        issue: 'Embedding costs suggest frequent vector operations',
        recommendation: 'Implement embedding caching, batch operations, use cheaper embedding models',
        estimatedSavings: breakdown.embedding * 0.4,
        implementation: 'medium',
        priority: 'medium'
      });
    }

    // 3. Database Cost Analysis
    if (breakdown.database > totalDaily * 0.15) {
      recommendations.push({
        id: 'db-query-optimize',
        category: 'Database',
        issue: 'Database costs indicate inefficient queries or high operation count',
        recommendation: 'Add query indexing, implement connection pooling, cache frequently accessed data',
        estimatedSavings: breakdown.database * 0.35,
        implementation: 'medium',
        priority: 'medium'
      });
    }

    // 4. Memory System Analysis
    if (breakdown.memory > totalDaily * 0.1) {
      recommendations.push({
        id: 'memory-optimization',
        category: 'Memory',
        issue: 'Memory system operations are costly',
        recommendation: 'Implement tiered caching (hot/warm/cold), reduce vector DB queries via materialization',
        estimatedSavings: breakdown.memory * 0.25,
        implementation: 'high',
        priority: 'low'
      });
    }

    // 5. Compute Analysis
    if (breakdown.compute > totalDaily * 0.05) {
      recommendations.push({
        id: 'compute-efficiency',
        category: 'Compute',
        issue: 'Agent reasoning and autonomy cycles consuming resources',
        recommendation: 'Optimize agent decision thresholds, reduce loop iterations, implement early termination',
        estimatedSavings: breakdown.compute * 0.2,
        implementation: 'high',
        priority: 'low'
      });
    }

    // Sort by potential savings
    return recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }

  /**
   * Get cost statistics
   */
  getStats(hoursBack: number = 24): {
    totalCost: number;
    costPerHour: number;
    estimatedDailyCost: number;
    estimatedMonthlyCost: number;
    topCategories: Array<{ category: string; cost: number }>;
  } {
    const breakdown = this.getCostBreakdown(hoursBack);
    const total = breakdown.total;
    const perHour = total / hoursBack;
    const perDay = perHour * 24;
    const perMonth = perDay * 30;

    const topCategories = [
      { category: 'LLM', cost: breakdown.llm },
      { category: 'Embedding', cost: breakdown.embedding },
      { category: 'Database', cost: breakdown.database },
      { category: 'Memory', cost: breakdown.memory },
      { category: 'Compute', cost: breakdown.compute },
      { category: 'Other', cost: breakdown.other }
    ]
      .filter(c => c.cost > 0)
      .sort((a, b) => b.cost - a.cost);

    return {
      totalCost: total,
      costPerHour: perHour,
      estimatedDailyCost: perDay,
      estimatedMonthlyCost: perMonth,
      topCategories
    };
  }

  /**
   * Clear cost history (for testing)
   */
  clearHistory(): void {
    this.costs = [];
    try {
      if (fs.existsSync(this.costFilePath)) {
        fs.unlinkSync(this.costFilePath);
      }
    } catch (err) {
      // Ignore
    }
  }
}

// Singleton instance
export const costTracker = new CostTracker();
