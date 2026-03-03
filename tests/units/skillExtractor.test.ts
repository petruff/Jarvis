/**
 * Skill Extractor Tests
 */

import { SkillExtractor } from '../../packages/jarvis-backend/src/skills/skillExtractor'
import { PatternAnalyzer, ExecutionSequence, ExecutionStep, DetectedPattern } from '../../packages/jarvis-backend/src/skills/patternAnalyzer'

describe('SkillExtractor', () => {
  let extractor: SkillExtractor
  let analyzer: PatternAnalyzer

  beforeEach(() => {
    extractor = new SkillExtractor()
    analyzer = new PatternAnalyzer()
  })

  const createStep = (toolId: string): ExecutionStep => ({
    toolId,
    toolName: toolId,
    inputs: { param1: 'value1', param2: 42 },
    outputs: { result: 'output' },
    success: true,
    durationMs: 100,
    timestamp: new Date()
  })

  const createSequence = (toolIds: string[]): ExecutionSequence => ({
    id: `seq-${Math.random()}`,
    agentId: 'agent-1',
    squadId: 'squad-1',
    steps: toolIds.map(id => createStep(id)),
    success: true,
    totalDuration: toolIds.length * 100,
    timestamp: new Date()
  })

  const createPattern = (): DetectedPattern => ({
    id: 'pattern-1',
    pattern: ['tool_a', 'tool_b', 'tool_c'],
    frequency: 5,
    successRate: 100,
    confidence: 0.95,
    averageDuration: 300,
    lastSeen: new Date(),
    usedInSequences: []
  })

  test('extracts skill from pattern', () => {
    const pattern = createPattern()
    const skill = extractor.extractSkill(pattern, [])

    expect(skill).toBeDefined()
    expect(skill.name).toBeTruthy()
    expect(skill.pattern).toEqual(pattern.pattern)
    expect(skill.version).toBe(1)
  })

  test('validates production-ready skills', () => {
    const pattern = createPattern()
    const skill = extractor.extractSkill(pattern, [])

    const result = extractor.validateSkill(skill)

    expect(result).toBeDefined()
    expect(result.isValid).toBe(true) // High success rate
    expect(result.readinessScore).toBeGreaterThan(70)
  })

  test('rejects low success rate skills', () => {
    const pattern = createPattern()
    pattern.successRate = 50 // Too low

    const skill = extractor.extractSkill(pattern, [])
    const result = extractor.validateSkill(skill)

    expect(result.isValid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  test('generates meaningful skill names', () => {
    const pattern: DetectedPattern = {
      id: 'pattern-1',
      pattern: ['fetch_data', 'validate_data', 'store_data'],
      frequency: 5,
      successRate: 95,
      confidence: 0.9,
      averageDuration: 300,
      lastSeen: new Date(),
      usedInSequences: []
    }

    const skill = extractor.extractSkill(pattern, [])

    expect(skill.name).toContain('_skill')
    expect(skill.name.length).toBeGreaterThan(0)
  })

  test('validates low frequency skills with warnings', () => {
    const pattern = createPattern()
    pattern.frequency = 2

    const skill = extractor.extractSkill(pattern, [])
    const result = extractor.validateSkill(skill)

    expect(result.warnings.length).toBeGreaterThan(0)
  })

  test('calculates readiness score', () => {
    const pattern = createPattern()
    const skill = extractor.extractSkill(pattern, [])
    const result = extractor.validateSkill(skill)

    expect(result.readinessScore).toBeGreaterThanOrEqual(0)
    expect(result.readinessScore).toBeLessThanOrEqual(100)
  })
})
