import { SkillRegistry } from '../../src/skills/skillRegistry'
import { Skill } from '../../src/skills/skillExtractor'

describe('SkillRegistry', () => {
  let registry: SkillRegistry

  beforeEach(() => {
    registry = new SkillRegistry()
  })

  test('should register skill', () => {
    const skill: Skill = {
      id: 'skill-1',
      name: 'Test Skill',
      description: 'A test skill',
      patternId: 'pattern-1',
      parameters: [],
      returns: 'Result',
      version: 1,
      createdAt: new Date(),
      successRate: 0.9,
      usageCount: 0,
    }

    const entry = registry.registerSkill(skill, ['forge'])
    expect(entry.skill.id).toBe(skill.id)
    expect(entry.squads).toContain('forge')
  })

  test('should retrieve skill from registry', () => {
    const skill: Skill = {
      id: 'skill-retrieve',
      name: 'Retrieve Skill',
      description: 'Test retrieval',
      patternId: 'pattern-2',
      parameters: [],
      returns: 'Data',
      version: 1,
      createdAt: new Date(),
      successRate: 0.85,
      usageCount: 0,
    }

    registry.registerSkill(skill, ['nexus'])
    const retrieved = registry.getSkill(skill.id)
    expect(retrieved).toBeDefined()
    expect(retrieved?.skill.name).toBe('Retrieve Skill')
  })

  test('should get skills by squad', () => {
    const skill1: Skill = {
      id: 's1',
      name: 'Skill 1',
      description: '',
      patternId: 'p1',
      parameters: [],
      returns: 'Result',
      version: 1,
      createdAt: new Date(),
      successRate: 0.9,
      usageCount: 0,
    }

    const skill2: Skill = {
      id: 's2',
      name: 'Skill 2',
      description: '',
      patternId: 'p2',
      parameters: [],
      returns: 'Result',
      version: 1,
      createdAt: new Date(),
      successRate: 0.88,
      usageCount: 0,
    }

    registry.registerSkill(skill1, ['forge'])
    registry.registerSkill(skill2, ['oracle'])

    const forgeSkills = registry.getSkillsBySquad('forge')
    expect(forgeSkills.length).toBeGreaterThan(0)
    expect(forgeSkills[0].squads).toContain('forge')
  })

  test('should deprecate skills', () => {
    const skill: Skill = {
      id: 'skill-dep',
      name: 'Deprecated Skill',
      description: '',
      patternId: 'pattern',
      parameters: [],
      returns: 'Result',
      version: 1,
      createdAt: new Date(),
      successRate: 0.9,
      usageCount: 0,
    }

    registry.registerSkill(skill, ['all'])
    const result = registry.deprecateSkill(skill.id, 'skill-new')
    expect(result).toBe(true)
  })

  test('should get registry statistics', () => {
    const skill: Skill = {
      id: 'stats-skill',
      name: 'Stats Skill',
      description: '',
      patternId: 'pattern',
      parameters: [],
      returns: 'Result',
      version: 1,
      createdAt: new Date(),
      successRate: 0.9,
      usageCount: 0,
    }

    registry.registerSkill(skill, ['all'])
    const stats = registry.getStats()
    expect(stats.totalSkills).toBeGreaterThan(0)
    expect(stats.totalVersions).toBeGreaterThan(0)
  })
})
