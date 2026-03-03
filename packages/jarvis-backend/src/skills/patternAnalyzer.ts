/**
 * Pattern Analyzer - Detects recurring execution sequences from agent task logs
 */

import { v4 as uuidv4 } from 'uuid'

export interface ExecutionStep {
  toolId: string
  toolName: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  success: boolean
  durationMs: number
  timestamp: Date
}

export interface ExecutionSequence {
  id: string
  agentId: string
  squadId: string
  steps: ExecutionStep[]
  success: boolean
  totalDuration: number
  timestamp: Date
}

export interface DetectedPattern {
  id: string
  pattern: string[]
  frequency: number
  successRate: number
  confidence: number
  averageDuration: number
  lastSeen: Date
  usedInSequences: string[]
}

export class PatternAnalyzer {
  detectPatterns(executions: ExecutionSequence[]): DetectedPattern[] {
    if (executions.length === 0) return []

    const patterns = new Map<string, PatternInfo>()

    // Extract sequences of 3+ tool calls
    for (const execution of executions) {
      if (execution.steps.length < 3) continue

      const steps = execution.steps.map(s => s.toolId)

      // Generate all subpatterns
      for (let len = 3; len <= steps.length; len++) {
        for (let i = 0; i <= steps.length - len; i++) {
          const subpattern = steps.slice(i, i + len).join('->')

          if (!patterns.has(subpattern)) {
            patterns.set(subpattern, {
              pattern: steps.slice(i, i + len),
              executions: [],
              successes: 0
            })
          }

          const info = patterns.get(subpattern)!
          info.executions.push({
            executionId: execution.id,
            success: execution.success,
            duration: this.sumDuration(execution.steps.slice(i, i + len))
          })

          if (execution.success) {
            info.successes++
          }
        }
      }
    }

    // Filter and rank patterns
    const results: DetectedPattern[] = []

    for (const [, info] of patterns) {
      if (info.executions.length < 3) continue

      const successRate = (info.successes / info.executions.length) * 100
      const frequency = info.executions.length
      const frequencyScore = Math.min(frequency / 10, 1.0)
      const successScore = successRate / 100
      const confidence = (frequencyScore * 0.6) + (successScore * 0.4)

      results.push({
        id: uuidv4(),
        pattern: info.pattern,
        frequency,
        successRate,
        confidence,
        averageDuration: info.executions.reduce((sum, e) => sum + e.duration, 0) / info.executions.length,
        lastSeen: new Date(),
        usedInSequences: info.executions.map(e => e.executionId)
      })
    }

    return results.sort((a, b) => b.confidence - a.confidence)
  }

  private sumDuration(steps: ExecutionStep[]): number {
    return steps.reduce((sum, step) => sum + step.durationMs, 0)
  }

  recommendPatterns(patterns: DetectedPattern[], topN: number = 5): DetectedPattern[] {
    return patterns
      .filter(p => p.confidence >= 0.6)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, topN)
  }
}

interface PatternInfo {
  pattern: string[]
  executions: Array<{ executionId: string; success: boolean; duration: number }>
  successes: number
}
