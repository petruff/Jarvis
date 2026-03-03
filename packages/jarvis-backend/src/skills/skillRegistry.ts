// Story 4.2: Skill Registry
// Manages discovered skills across squads

import { ExtractedSkill } from './skillExtractor'

export interface SkillVersion {
  version: number
  createdAt: Date
  deprecated: boolean
  replacedBy?: string
}

export interface SkillRegistryEntry {
  skill: ExtractedSkill
  versions: SkillVersion[]
  squads: string[] // which squads can use this skill
  tags: string[]
}

export class SkillRegistry {
  private registry: Map<string, SkillRegistryEntry> = new Map()

  /**
   * Register a skill in the registry
   */
  registerSkill(skill: ExtractedSkill, squads: string[], tags: string[] = []): SkillRegistryEntry {
    const entry: SkillRegistryEntry = {
      skill,
      versions: [{ version: 1, createdAt: new Date(), deprecated: false }],
      squads: squads || ['all'],
      tags: tags || [],
    }

    this.registry.set(skill.id, entry)
    return entry
  }

  /**
   * Get skill from registry
   */
  getSkill(skillId: string): SkillRegistryEntry | undefined {
    return this.registry.get(skillId)
  }

  /**
   * Get all skills
   */
  getAllSkills(): SkillRegistryEntry[] {
    return Array.from(this.registry.values())
  }

  /**
   * Get skills available to a squad
   */
  getSkillsBySquad(squad: string): SkillRegistryEntry[] {
    return Array.from(this.registry.values()).filter(
      (entry) => entry.squads.includes('all') || entry.squads.includes(squad)
    )
  }

  /**
   * Get skills by tag
   */
  getSkillsByTag(tag: string): SkillRegistryEntry[] {
    return Array.from(this.registry.values()).filter((entry) => entry.tags.includes(tag))
  }

  /**
   * Mark skill as deprecated
   */
  deprecateSkill(skillId: string, replacedBy?: string): boolean {
    const entry = this.registry.get(skillId)
    if (!entry) return false

    entry.versions[entry.versions.length - 1].deprecated = true
    if (replacedBy) {
      entry.versions[entry.versions.length - 1].replacedBy = replacedBy
    }

    return true
  }

  /**
   * Add squad to skill availability
   */
  addSquadToSkill(skillId: string, squad: string): boolean {
    const entry = this.registry.get(skillId)
    if (!entry) return false

    if (!entry.squads.includes(squad)) {
      entry.squads.push(squad)
    }
    return true
  }

  /**
   * Get registry statistics
   */
  getStats(): { totalSkills: number; totalVersions: number; deprecatedCount: number } {
    const entries = Array.from(this.registry.values())
    return {
      totalSkills: entries.length,
      totalVersions: entries.reduce((sum, e) => sum + e.versions.length, 0),
      deprecatedCount: entries.filter((e) => e.versions[e.versions.length - 1].deprecated).length,
    }
  }
}
