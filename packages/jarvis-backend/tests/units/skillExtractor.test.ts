import { SkillExtractor } from '../../src/skills/skillExtractor'
import { Pattern } from '../../src/skills/patternAnalyzer'

describe('SkillExtractor', () => {
  let extractor: SkillExtractor

  beforeEach(() => {
    extractor = new SkillExtractor()
  })

  test('should extract skill from pattern', () => {
    const pattern: Pattern = {
      id: 'pattern-1',
      name: 'Query Pattern',
      steps: ['query', 'parse', 'execute'],
      frequency: 5,
      successRate: 0.9,
      instances: 5,
      created: new Date(),
    }

    const skill = extractor.extractSkill(pattern, 'oracle')
    expect(skill).toBeDefined()
    expect(skill.patternId).toBe(pattern.id)
    expect(skill.successRate).toBe(0.9)
  })

  test('should generate descriptive skill names', () => {
    const pattern: Pattern = {
      id: 'pattern-2',
      name: 'Test',
      steps: ['analyze', 'synthesize'],
      frequency: 3,
      successRate: 0.85,
      instances: 3,
      created: new Date(),
    }

    const skill = extractor.extractSkill(pattern, 'nexus')
    expect(skill.name).toContain('Skill')
    expect(skill.name).toContain('Analyze')
  })

  test('should validate extractedskills', () => {
    const pattern: Pattern = {
      id: 'pattern-3',
      name: 'Valid',
      steps: ['step1', 'step2', 'step3'],
      frequency: 4,
      successRate: 0.88,
      instances: 4,
      created: new Date(),
    }

    const skill = extractor.extractSkill(pattern, 'forge')
    expect(extractor.validateSkill(skill)).toBe(true)
  })

  test('should extract parameters from pattern', () => {
    const pattern: Pattern = {
      id: 'pattern-4',
      name: 'Param Test',
      steps: ['read', 'write'],
      frequency: 3,
      successRate: 0.92,
      instances: 3,
      created: new Date(),
    }

    const skill = extractor.extractSkill(pattern, 'forge')
    expect(skill.parameters.length).toBeGreaterThan(0)
    expect(skill.parameters[0].type).toBeDefined()
  })

  test('should retrieve all extracted skills', () => {
    const pattern1: Pattern = {
      id: 'p1',
      name: 'Pattern 1',
      steps: ['a', 'b'],
      frequency: 3,
      successRate: 0.9,
      instances: 3,
      created: new Date(),
    }

    const pattern2: Pattern = {
      id: 'p2',
      name: 'Pattern 2',
      steps: ['c', 'd'],
      frequency: 4,
      successRate: 0.88,
      instances: 4,
      created: new Date(),
    }

    extractor.extractSkill(pattern1, 'squad1')
    extractor.extractSkill(pattern2, 'squad2')

    const skills = extractor.getAllSkills()
    expect(skills.length).toBe(2)
  })
})
