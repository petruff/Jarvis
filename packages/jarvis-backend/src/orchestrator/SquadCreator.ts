/**
 * JARVIS Squad Creator - Dynamic squad creation based on goal needs
 *
 * Responsibilities:
 * 1. Analyze goal to determine needed expertise areas
 * 2. Suggest squads based on goal type
 * 3. Create specialized squads with appropriate agents
 * 4. Optimize squad composition for goal
 */

export interface Squad {
  id: string
  name: string
  icon: string
  description: string
  agents: string[]
  color: string
  expertise: string[]
  capabilitiesNeeded: string[]
}

export const AVAILABLE_AGENTS = {
  // STRATEGY SQUAD
  pm: { name: '@pm', expertise: 'Product Management', squad: 'strategy' },
  po: { name: '@po', expertise: 'Product Owner', squad: 'strategy' },
  analyst: { name: '@analyst', expertise: 'Market Analysis', squad: 'strategy' },

  // ENGINEERING SQUAD
  dev: { name: '@dev', expertise: 'Full Stack Development', squad: 'forge' },
  architect: { name: '@architect', expertise: 'Architecture & Design', squad: 'forge' },
  qa: { name: '@qa', expertise: 'Quality Assurance', squad: 'forge' },

  // DATA & INFRASTRUCTURE
  dataEngineer: { name: '@data-engineer', expertise: 'Database Design', squad: 'data' },
  devops: { name: '@devops', expertise: 'DevOps & Infrastructure', squad: 'devops' },

  // DESIGN & UX
  uxDesign: { name: '@ux-design-expert', expertise: 'UX/UI Design', squad: 'nexus' },

  // CONTENT & GROWTH
  copyWriter: { name: '@copy-writer', expertise: 'Content & Copy', squad: 'mercury' },
  researcher: { name: '@researcher', expertise: 'Research', squad: 'oracle' },
}

export const PREDEFINED_SQUADS: Record<string, Squad> = {
  strategy: {
    id: 'strategy',
    name: 'Strategy Squad',
    icon: '📋',
    description: 'Product strategy, planning, and market analysis',
    agents: ['@pm', '@po', '@analyst'],
    color: '#00d4ff',
    expertise: ['business strategy', 'product planning', 'market analysis'],
    capabilitiesNeeded: ['business planning', 'research', 'documentation']
  },
  forge: {
    id: 'forge',
    name: 'Forge Squad',
    icon: '🔨',
    description: 'Code development, architecture, and QA',
    agents: ['@dev', '@architect', '@qa'],
    color: '#ff00ff',
    expertise: ['backend', 'frontend', 'full stack', 'testing', 'architecture'],
    capabilitiesNeeded: ['coding', 'testing', 'architecture design', 'code review']
  },
  data: {
    id: 'data',
    name: 'Data Squad',
    icon: '🗄️',
    description: 'Database design and data engineering',
    agents: ['@data-engineer'],
    color: '#00ff88',
    expertise: ['database', 'data modeling', 'query optimization', 'data pipelines'],
    capabilitiesNeeded: ['database design', 'data engineering']
  },
  devops: {
    id: 'devops',
    name: 'DevOps Squad',
    icon: '⚙️',
    description: 'Infrastructure, deployment, and CI/CD',
    agents: ['@devops'],
    color: '#ffaa00',
    expertise: ['infrastructure', 'deployment', 'ci/cd', 'monitoring'],
    capabilitiesNeeded: ['infrastructure setup', 'ci/cd pipeline', 'deployment']
  },
  nexus: {
    id: 'nexus',
    name: 'Nexus Squad',
    icon: '🎨',
    description: 'Design, UX/UI, and user experience',
    agents: ['@ux-design-expert'],
    color: '#ff6b6b',
    expertise: ['ui design', 'ux design', 'branding', 'wireframes'],
    capabilitiesNeeded: ['ui/ux design', 'wireframing', 'prototyping']
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury Squad',
    icon: '📝',
    description: 'Content, copywriting, and marketing',
    agents: ['@copy-writer'],
    color: '#4ecdc4',
    expertise: ['copywriting', 'content creation', 'marketing copy', 'documentation'],
    capabilitiesNeeded: ['content writing', 'documentation', 'marketing']
  },
  oracle: {
    id: 'oracle',
    name: 'Oracle Squad',
    icon: '🔍',
    description: 'Research, analysis, and discovery',
    agents: ['@researcher', '@analyst'],
    color: '#a29bfe',
    expertise: ['research', 'analysis', 'discovery', 'competitive analysis'],
    capabilitiesNeeded: ['research', 'web search', 'data analysis']
  }
}

export class SquadCreator {
  /**
   * Analyze goal and suggest appropriate squads
   */
  async suggestAndCreate(goal: any, answers: Record<string, any>): Promise<string[]> {
    console.log(`\n🏗️ [SquadCreator] Analyzing goal for squad needs...`)

    // Determine needed expertise based on goal
    const neededExpertise = this.determineNeededExpertise(goal, answers)
    console.log(`   Expertise needed: ${neededExpertise.join(', ')}`)

    // Map expertise to squads
    const squads = this.mapExpertiseToSquads(neededExpertise)
    console.log(`   Suggested squads: ${squads.join(', ')}`)

    // Create and return squads
    return squads
  }

  /**
   * Determine what expertise is needed based on goal type and complexity
   */
  private determineNeededExpertise(goal: any, answers: Record<string, any>): string[] {
    const needed: string[] = []

    // Based on goal category
    switch (goal.category) {
      case 'business':
        needed.push('business strategy', 'product planning', 'market analysis')
        // If building a company, also need technical
        if (goal.originalIntent.toLowerCase().includes('company')) {
          needed.push('backend', 'frontend', 'database', 'infrastructure')
          needed.push('ui design', 'content creation')
        }
        break

      case 'technical':
        needed.push('backend', 'frontend', 'architecture')
        if (goal.originalIntent.toLowerCase().includes('database') || goal.originalIntent.includes('data')) {
          needed.push('database', 'data engineering')
        }
        if (goal.originalIntent.toLowerCase().includes('deploy') || goal.originalIntent.includes('cloud')) {
          needed.push('infrastructure', 'ci/cd')
        }
        needed.push('testing')
        break

      case 'research':
        needed.push('research', 'analysis', 'web search')
        if (goal.originalIntent.toLowerCase().includes('market') || goal.originalIntent.includes('competitor')) {
          needed.push('market analysis', 'competitive analysis')
        }
        break

      case 'content':
        needed.push('content creation', 'copywriting', 'documentation')
        if (goal.originalIntent.toLowerCase().includes('website') || goal.originalIntent.includes('product')) {
          needed.push('ui design', 'ux design')
        }
        break
    }

    // Add based on complexity
    if (goal.complexity === 'enterprise') {
      if (!needed.includes('business strategy')) needed.push('business strategy')
      if (!needed.includes('infrastructure')) needed.push('infrastructure')
      if (!needed.includes('database')) needed.push('database')
    }

    // Remove duplicates
    return [...new Set(needed)]
  }

  /**
   * Map expertise to specific squads
   */
  private mapExpertiseToSquads(expertise: string[]): string[] {
    const squads = new Set<string>()

    expertise.forEach(exp => {
      const exp_lower = exp.toLowerCase()

      // Strategy expertise
      if (exp_lower.includes('strategy') || exp_lower.includes('planning') || exp_lower.includes('product')) {
        squads.add('strategy')
      }

      // Engineering expertise
      if (exp_lower.includes('backend') || exp_lower.includes('frontend') || exp_lower.includes('architecture') ||
          exp_lower.includes('full stack') || exp_lower.includes('coding')) {
        squads.add('forge')
      }

      // Data expertise
      if (exp_lower.includes('database') || exp_lower.includes('data engineering') || exp_lower.includes('data modeling')) {
        squads.add('data')
      }

      // DevOps expertise
      if (exp_lower.includes('infrastructure') || exp_lower.includes('ci/cd') || exp_lower.includes('deployment') ||
          exp_lower.includes('cloud')) {
        squads.add('devops')
      }

      // Design expertise
      if (exp_lower.includes('ui') || exp_lower.includes('ux') || exp_lower.includes('design') ||
          exp_lower.includes('branding') || exp_lower.includes('wireframe')) {
        squads.add('nexus')
      }

      // Content expertise
      if (exp_lower.includes('content') || exp_lower.includes('copywriting') || exp_lower.includes('documentation') ||
          exp_lower.includes('marketing')) {
        squads.add('mercury')
      }

      // Research expertise
      if (exp_lower.includes('research') || exp_lower.includes('analysis') || exp_lower.includes('web search') ||
          exp_lower.includes('competitive')) {
        squads.add('oracle')
      }
    })

    return Array.from(squads)
  }

  /**
   * Create custom squad based on specific needs
   */
  createCustomSquad(
    name: string,
    agents: string[],
    expertise: string[]
  ): Squad {
    return {
      id: `custom-${Date.now()}`,
      name,
      icon: '⭐',
      description: `Custom squad for ${expertise.join(', ')}`,
      agents,
      color: '#ff69b4',
      expertise,
      capabilitiesNeeded: expertise
    }
  }

  /**
   * Get squad by ID
   */
  getSquad(squadId: string): Squad | null {
    return PREDEFINED_SQUADS[squadId] || null
  }

  /**
   * Get all available squads
   */
  getAllSquads(): Record<string, Squad> {
    return PREDEFINED_SQUADS
  }

  /**
   * Get agents for specific squad
   */
  getSquadAgents(squadId: string): string[] {
    const squad = this.getSquad(squadId)
    return squad ? squad.agents : []
  }
}

export default SquadCreator
