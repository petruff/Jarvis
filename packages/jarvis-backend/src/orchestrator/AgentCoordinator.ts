/**
 * JARVIS Agent Coordinator - Assign & Execute Tasks with Agents
 *
 * Responsibilities:
 * 1. Match tasks to appropriate agents based on expertise
 * 2. Manage agent capacity and workload balancing
 * 3. Execute tasks with assigned agents in parallel
 * 4. Handle agent failures and retries
 * 5. Track agent performance and health
 */

export interface AgentInfo {
  id: string
  name: string
  expertise: string[]
  squad: string
  maxConcurrentTasks: number
  currentLoadCount: number
  healthScore: number // 0-100
  successRate: number // 0-100
}

export interface TaskAssignment {
  taskId: string
  agentId: string
  assignedAt: Date
  startedAt?: Date
  completedAt?: Date
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  result?: any
  error?: string
}

export class AgentCoordinator {
  private agentRegistry: Map<string, AgentInfo> = new Map()
  private assignments: Map<string, TaskAssignment[]> = new Map() // taskId -> assignments
  private agentWorkload: Map<string, number> = new Map() // agentId -> current load

  constructor() {
    this.initializeAgents()
  }

  /**
   * Initialize available agents with their capabilities
   */
  private initializeAgents(): void {
    const agents: AgentInfo[] = [
      {
        id: '@dev',
        name: 'Dex (Developer)',
        expertise: ['backend', 'frontend', 'full-stack', 'architecture', 'coding'],
        squad: 'forge',
        maxConcurrentTasks: 3,
        currentLoadCount: 0,
        healthScore: 95,
        successRate: 92
      },
      {
        id: '@architect',
        name: 'Aria (Architect)',
        expertise: ['architecture', 'design', 'system-design', 'scalability'],
        squad: 'forge',
        maxConcurrentTasks: 2,
        currentLoadCount: 0,
        healthScore: 98,
        successRate: 96
      },
      {
        id: '@qa',
        name: 'Quinn (QA)',
        expertise: ['testing', 'quality', 'validation', 'security'],
        squad: 'forge',
        maxConcurrentTasks: 3,
        currentLoadCount: 0,
        healthScore: 94,
        successRate: 95
      },
      {
        id: '@data-engineer',
        name: 'Dara (Data Engineer)',
        expertise: ['database', 'schema', 'data-modeling', 'optimization'],
        squad: 'data',
        maxConcurrentTasks: 2,
        currentLoadCount: 0,
        healthScore: 97,
        successRate: 97
      },
      {
        id: '@pm',
        name: 'Morgan (PM)',
        expertise: ['planning', 'strategy', 'requirements', 'prd'],
        squad: 'strategy',
        maxConcurrentTasks: 2,
        currentLoadCount: 0,
        healthScore: 93,
        successRate: 90
      },
      {
        id: '@ux-design-expert',
        name: 'Uma (UX Designer)',
        expertise: ['ui', 'ux', 'design', 'wireframes', 'prototyping'],
        squad: 'nexus',
        maxConcurrentTasks: 2,
        currentLoadCount: 0,
        healthScore: 96,
        successRate: 94
      },
      {
        id: '@analyst',
        name: 'Atlas (Analyst)',
        expertise: ['research', 'analysis', 'data-analysis', 'market-analysis'],
        squad: 'oracle',
        maxConcurrentTasks: 3,
        currentLoadCount: 0,
        healthScore: 95,
        successRate: 93
      },
      {
        id: '@devops',
        name: 'Gage (DevOps)',
        expertise: ['deployment', 'infrastructure', 'ci-cd', 'monitoring'],
        squad: 'devops',
        maxConcurrentTasks: 2,
        currentLoadCount: 0,
        healthScore: 99,
        successRate: 98
      }
    ]

    agents.forEach(agent => {
      this.agentRegistry.set(agent.id, agent)
      this.agentWorkload.set(agent.id, 0)
    })

    console.log(`✅ [AgentCoordinator] Registered ${agents.length} agents`)
  }

  /**
   * Match tasks to appropriate agents based on expertise
   */
  async matchAgentsToTasks(tasks: any[], squads: string[]): Promise<Map<string, string[]>> {
    console.log(`\n🤝 [AgentCoordinator] Matching ${tasks.length} tasks to agents...`)

    const assignments = new Map<string, string[]>() // taskId -> [agentId]

    for (const task of tasks) {
      const assignedAgents = this.selectAgentsForTask(task, squads)

      if (assignedAgents.length === 0) {
        console.warn(`⚠️  No agents found for task: ${task.title}`)
      }

      assignments.set(task.id, assignedAgents)

      // Update workload
      for (const agentId of assignedAgents) {
        const current = this.agentWorkload.get(agentId) || 0
        this.agentWorkload.set(agentId, current + 1)
      }
    }

    console.log(`   Assigned ${tasks.length} tasks across ${this.getActiveAgentCount()} agents`)
    this.logWorkloadDistribution()

    return assignments
  }

  /**
   * Select best agents for a specific task based on expertise and availability
   */
  private selectAgentsForTask(task: any, squads: string[]): string[] {
    const selectedAgents: string[] = []

    // Find agents from assigned squads
    const candidateAgents = Array.from(this.agentRegistry.values()).filter(agent => {
      return task.assignedSquads.includes(agent.squad)
    })

    if (candidateAgents.length === 0) {
      // Fallback: find agents by expertise
      const expertiseKeywords = this.extractExpertiseKeywords(task)
      return this.selectByExpertise(expertiseKeywords)
    }

    // Sort by availability and health
    candidateAgents.sort((a, b) => {
      const aLoad = this.agentWorkload.get(a.id) || 0
      const bLoad = this.agentWorkload.get(b.id) || 0
      const aAvailable = a.maxConcurrentTasks - aLoad
      const bAvailable = b.maxConcurrentTasks - bLoad

      if (aAvailable !== bAvailable) {
        return bAvailable - aAvailable // Higher availability first
      }

      return b.healthScore - a.healthScore // Higher health score first
    })

    // Select agents with available capacity
    for (const agent of candidateAgents) {
      const currentLoad = this.agentWorkload.get(agent.id) || 0
      if (currentLoad < agent.maxConcurrentTasks) {
        selectedAgents.push(agent.id)

        // For most tasks, one agent is enough
        if (selectedAgents.length >= 1) break

        // For complex tasks, assign 2 agents
        if (task.priority === 'critical' && selectedAgents.length < 2) {
          continue // Try to get a second agent
        }
      }
    }

    return selectedAgents.length > 0 ? selectedAgents : this.selectByLoad()
  }

  /**
   * Extract expertise keywords from task
   */
  private extractExpertiseKeywords(task: any): string[] {
    const keywords: string[] = []

    const content = `${task.title} ${task.description} ${task.category}`.toLowerCase()

    // Match against known expertise areas
    const expertiseMap: Record<string, string[]> = {
      backend: ['backend', 'api', 'server', 'database', 'service'],
      frontend: ['frontend', 'ui', 'web', 'react', 'component'],
      database: ['database', 'schema', 'migration', 'data', 'sql'],
      testing: ['test', 'qa', 'quality', 'validation', 'security'],
      design: ['design', 'ui', 'ux', 'wireframe', 'prototype'],
      deployment: ['deploy', 'infrastructure', 'ci/cd', 'devops'],
      planning: ['plan', 'strategy', 'requirement', 'prd'],
      research: ['research', 'analysis', 'market', 'competitive']
    }

    for (const [expertise, terms] of Object.entries(expertiseMap)) {
      if (terms.some(term => content.includes(term))) {
        keywords.push(expertise)
      }
    }

    return keywords
  }

  /**
   * Select agents by required expertise
   */
  private selectByExpertise(keywords: string[]): string[] {
    const candidates: { agent: AgentInfo; matchCount: number }[] = []

    for (const agent of this.agentRegistry.values()) {
      let matchCount = 0
      for (const keyword of keywords) {
        if (agent.expertise.some(exp => exp.includes(keyword))) {
          matchCount++
        }
      }

      if (matchCount > 0) {
        candidates.push({ agent, matchCount })
      }
    }

    // Sort by match count and availability
    candidates.sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount
      }

      const aLoad = this.agentWorkload.get(a.agent.id) || 0
      const bLoad = this.agentWorkload.get(b.agent.id) || 0
      const aAvailable = a.agent.maxConcurrentTasks - aLoad
      const bAvailable = b.agent.maxConcurrentTasks - bLoad

      return bAvailable - aAvailable
    })

    // Return top matching agents with available capacity
    return candidates
      .filter(c => {
        const load = this.agentWorkload.get(c.agent.id) || 0
        return load < c.agent.maxConcurrentTasks
      })
      .slice(0, 2)
      .map(c => c.agent.id)
  }

  /**
   * Select agents by lowest current workload
   */
  private selectByLoad(): string[] {
    const candidates = Array.from(this.agentRegistry.values())
      .filter(agent => {
        const load = this.agentWorkload.get(agent.id) || 0
        return load < agent.maxConcurrentTasks
      })
      .sort((a, b) => {
        const aLoad = this.agentWorkload.get(a.id) || 0
        const bLoad = this.agentWorkload.get(b.id) || 0
        return aLoad - bLoad
      })

    return candidates.length > 0 ? [candidates[0].id] : []
  }

  /**
   * Execute task with assigned agents
   */
  async executeWithAgent(agentId: string, task: any): Promise<any> {
    const agent = this.agentRegistry.get(agentId)

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    const assignment: TaskAssignment = {
      taskId: task.id,
      agentId,
      assignedAt: new Date(),
      status: 'pending'
    }

    // Record assignment
    if (!this.assignments.has(task.id)) {
      this.assignments.set(task.id, [])
    }
    this.assignments.get(task.id)!.push(assignment)

    console.log(`\n👤 [${agentId}] Executing: ${task.title}`)

    try {
      // Mark as in-progress
      assignment.status = 'in-progress'
      assignment.startedAt = new Date()

      // Simulate agent execution with realistic timing
      const result = await this.simulateAgentExecution(agentId, task)

      // Mark as completed
      assignment.status = 'completed'
      assignment.completedAt = new Date()
      assignment.result = result

      const duration = assignment.completedAt.getTime() - assignment.startedAt.getTime()
      console.log(`   ✅ Completed in ${duration}ms`)

      return result
    } catch (error) {
      assignment.status = 'failed'
      assignment.error = error instanceof Error ? error.message : 'Unknown error'
      assignment.completedAt = new Date()

      console.error(`   ❌ Failed: ${assignment.error}`)

      throw error
    }
  }

  /**
   * Simulate agent execution (placeholder for real agent communication)
   */
  private async simulateAgentExecution(agentId: string, task: any): Promise<any> {
    // In production, this would:
    // 1. Serialize task to agent-specific format
    // 2. Send to agent via socket, message queue, or RPC
    // 3. Wait for agent completion
    // 4. Deserialize result

    // For now, simulate with realistic delay based on task complexity
    const delayMs = this.getEstimatedExecutionTime(task)

    await new Promise(resolve => setTimeout(resolve, delayMs))

    // Return simulated result
    return {
      agentId,
      taskId: task.id,
      status: 'completed',
      output: `${task.title} completed by ${agentId}`,
      timestamp: new Date(),
      quality: Math.random() > 0.1 ? 'high' : 'medium' // 90% high quality
    }
  }

  /**
   * Get estimated execution time for task in milliseconds
   */
  private getEstimatedExecutionTime(task: any): number {
    // Base time per hour of estimated work
    const msPerHour = 500 // Simulate 1 hour = 500ms

    let baseTime = task.estimatedHours * msPerHour

    // Adjust based on priority
    const priorityMultiplier: Record<string, number> = {
      critical: 1.5,
      high: 1.2,
      medium: 1.0,
      low: 0.8
    }

    baseTime *= priorityMultiplier[task.priority] || 1.0

    // Add randomness (±20%)
    const variance = baseTime * 0.2
    return baseTime + (Math.random() - 0.5) * variance * 2
  }

  /**
   * Get assignment history for task
   */
  getAssignmentHistory(taskId: string): TaskAssignment[] {
    return this.assignments.get(taskId) || []
  }

  /**
   * Get agent workload distribution
   */
  private getActiveAgentCount(): number {
    let count = 0
    for (const [_agentId, load] of this.agentWorkload.entries()) {
      if (load > 0) count++
    }
    return count
  }

  /**
   * Log current workload distribution
   */
  private logWorkloadDistribution(): void {
    console.log(`   Workload distribution:`)

    const distribution = Array.from(this.agentRegistry.values())
      .map(agent => {
        const load = this.agentWorkload.get(agent.id) || 0
        const utilization = (load / agent.maxConcurrentTasks * 100).toFixed(0)
        return `${agent.id}: ${load}/${agent.maxConcurrentTasks} (${utilization}%)`
      })
      .sort()

    distribution.forEach(line => console.log(`      ${line}`))
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentInfo | undefined {
    return this.agentRegistry.get(agentId)
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentInfo[] {
    return Array.from(this.agentRegistry.values())
  }

  /**
   * Update agent health score (after task completion)
   */
  updateAgentHealth(agentId: string, qualityScore: number): void {
    const agent = this.agentRegistry.get(agentId)
    if (!agent) return

    // Weighted average: 80% previous, 20% new score
    agent.healthScore = agent.healthScore * 0.8 + qualityScore * 0.2
    agent.healthScore = Math.max(0, Math.min(100, agent.healthScore))
  }

  /**
   * Reduce agent workload (when task completes)
   */
  reduceWorkload(agentId: string): void {
    const current = this.agentWorkload.get(agentId) || 0
    if (current > 0) {
      this.agentWorkload.set(agentId, current - 1)
    }
  }

  /**
   * Get total system capacity
   */
  getTotalCapacity(): number {
    return Array.from(this.agentRegistry.values())
      .reduce((sum, agent) => sum + agent.maxConcurrentTasks, 0)
  }

  /**
   * Get current system utilization
   */
  getCurrentUtilization(): number {
    const total = this.getTotalCapacity()
    const current = Array.from(this.agentWorkload.values())
      .reduce((sum, load) => sum + load, 0)

    return total > 0 ? (current / total) * 100 : 0
  }
}

export default AgentCoordinator
