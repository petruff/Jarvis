/**
 * Skill Extractor - Converts detected patterns into reusable skills
 */

import { v4 as uuidv4 } from 'uuid'
import { DetectedPattern, ExecutionSequence } from './patternAnalyzer'

export interface SkillParameter {
  name: string
  type: string
  description: string
  required: boolean
  examples: unknown[]
}

export interface ExtractedSkill {
  id: string
  name: string
  description: string
  pattern: string[]
  parameters: SkillParameter[]
  successRate: number
  frequency: number
  confidence: number
  estimatedDuration: number
  version: number
  createdAt: Date
}

export class SkillExtractor {
  /**
   * Convert a detected pattern into a reusable skill
   */
  extractSkill(pattern: DetectedPattern, executions: ExecutionSequence[]): ExtractedSkill {
    const skillName = this.generateSkillName(pattern.pattern)
    const parameters = this.extractParameters(pattern, executions)

    return {
      id: uuidv4(),
      name: skillName,
      description: this.generateDescription(pattern),
      pattern: pattern.pattern,
      parameters,
      successRate: pattern.successRate,
      frequency: pattern.frequency,
      confidence: pattern.confidence,
      estimatedDuration: pattern.averageDuration,
      version: 1,
      createdAt: new Date()
    }
  }

  /**
   * Validate if a skill is production-ready
   */
  validateSkill(skill: ExtractedSkill): ValidationResult {
    const issues: string[] = []
    const warnings: string[] = []

    // Check success rate
    if (skill.successRate < 80) {
      issues.push(`Success rate too low: ${skill.successRate.toFixed(1)}% (target: 80%+)`)
    }

    // Check frequency
    if (skill.frequency < 5) {
      warnings.push(`Low frequency: seen ${skill.frequency} times (recommend: 10+)`)
    }

    // Check confidence
    if (skill.confidence < 0.6) {
      issues.push(`Confidence score too low: ${skill.confidence.toFixed(2)} (target: 0.6+)`)
    }

    // Check parameters
    if (skill.parameters.length === 0) {
      warnings.push('No parameters extracted - skill may be too simple')
    }

    const isValid = issues.length === 0

    return {
      isValid,
      issues,
      warnings,
      readinessScore: this.calculateReadiness(skill)
    }
  }

  private generateSkillName(toolPattern: string[]): string {
    // Create a name from tool sequence
    const toolNames = toolPattern.slice(0, 2) // Use first 2 tools
    return toolNames.map(t => this.camelCase(t)).join('_') + '_skill'
  }

  private generateDescription(pattern: DetectedPattern): string {
    return `Auto-discovered skill from ${pattern.frequency} successful executions ` +
      `with ${pattern.successRate.toFixed(1)}% success rate`
  }

  private extractParameters(pattern: DetectedPattern, executions: ExecutionSequence[]): SkillParameter[] {
    const paramMap = new Map<string, ParameterInfo>()

    // Collect parameter usage across matching executions
    for (const execution of executions) {
      if (!this.matchesPattern(execution, pattern.pattern)) continue

      // Find where pattern starts
      for (let i = 0; i <= execution.steps.length - pattern.pattern.length; i++) {
        const matches = execution.steps
          .slice(i, i + pattern.pattern.length)
          .every((step, idx) => step.toolId === pattern.pattern[idx])

        if (!matches) continue

        // Extract inputs from each step
        for (let j = 0; j < pattern.pattern.length; j++) {
          const step = execution.steps[i + j]
          for (const [paramName, paramValue] of Object.entries(step.inputs)) {
            const key = `${j}_${paramName}`

            if (!paramMap.has(key)) {
              paramMap.set(key, {
                stepIndex: j,
                name: paramName,
                values: [],
                types: new Set()
              })
            }

            const info = paramMap.get(key)!
            info.values.push(paramValue)
            info.types.add(typeof paramValue)
          }
        }
      }
    }

    // Convert to SkillParameters
    return Array.from(paramMap.values())
      .filter(info => info.values.length > 0)
      .map(info => ({
        name: info.name,
        type: Array.from(info.types).join('|'),
        description: `Parameter for step ${info.stepIndex}`,
        required: true,
        examples: info.values.slice(0, 3)
      }))
  }

  private matchesPattern(execution: ExecutionSequence, pattern: string[]): boolean {
    if (execution.steps.length < pattern.length) return false

    for (let i = 0; i <= execution.steps.length - pattern.length; i++) {
      const match = execution.steps
        .slice(i, i + pattern.length)
        .every((step, idx) => step.toolId === pattern[idx])

      if (match) return true
    }

    return false
  }

  private calculateReadiness(skill: ExtractedSkill): number {
    // Score 0-100
    let score = 0

    // Success rate (40%)
    score += Math.min(skill.successRate, 100) * 0.4

    // Frequency (30%)
    score += Math.min((skill.frequency / 10) * 100, 100) * 0.3

    // Confidence (30%)
    score += skill.confidence * 100 * 0.3

    return Math.round(score)
  }

  private camelCase(str: string): string {
    return str
      .split('_')
      .map((word, idx) => idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }
}

interface ParameterInfo {
  stepIndex: number
  name: string
  values: unknown[]
  types: Set<string>
}

export interface ValidationResult {
  isValid: boolean
  issues: string[]
  warnings: string[]
  readinessScore: number
}
