// Story 4.2: Skill Manager
// Orchestrates pattern detection → skill extraction → registry management

import { PatternAnalyzer, DetectedPattern, ExecutionSequence } from './patternAnalyzer'
import { SkillExtractor, ExtractedSkill } from './skillExtractor'
import { SkillRegistry } from './skillRegistry'

export interface SkillDiscoveryResult {
  patternsDetected: DetectedPattern[]
  skillsExtracted: ExtractedSkill[]
  registered: number
  timestamp: Date
}

export class SkillManager {
  private analyzer: PatternAnalyzer
  private extractor: SkillExtractor
  private registry: SkillRegistry

  constructor() {
    this.analyzer = new PatternAnalyzer()
    this.extractor = new SkillExtractor()
    this.registry = new SkillRegistry()
  }

  /**
   * Full skill discovery pipeline
   * 1. Detect patterns from executions
   * 2. Extract skills from patterns
   * 3. Register skills for use
   */
  async discoverSkills(executions: ExecutionSequence[], squad: string = 'all'): Promise<SkillDiscoveryResult> {
    // Detect patterns
    const patterns = this.analyzer.detectPatterns(executions)

    // Extract skills from patterns
    const skills: ExtractedSkill[] = []
    for (const pattern of patterns) {
      const skill = this.extractor.extractSkill(pattern, executions)
      const validation = this.extractor.validateSkill(skill)
      if (validation.isValid) {
        skills.push(skill)
      }
    }

    // Register skills
    let registered = 0
    for (const skill of skills) {
      this.registry.registerSkill(skill, [squad], ['auto-discovered'])
      registered++
    }

    return {
      patternsDetected: patterns,
      skillsExtracted: skills,
      registered,
      timestamp: new Date(),
    }
  }

  /**
   * Get all discovered skills
   */
  getDiscoveredSkills(): ExtractedSkill[] {
    return this.registry.getAllSkills().map(entry => entry.skill)
  }

  /**
   * Get skills available to squad
   */
  getSquadSkills(squad: string): ExtractedSkill[] {
    return this.registry.getSkillsBySquad(squad).map((e) => e.skill)
  }

  /**
   * Get skill statistics
   */
  getStatistics() {
    const registryStats = this.registry.getStats()
    return {
      ...registryStats,
    }
  }

  /**
   * Deprecate a skill
   */
  deprecateSkill(skillId: string, replacedBy?: string): boolean {
    return this.registry.deprecateSkill(skillId, replacedBy)
  }
}
