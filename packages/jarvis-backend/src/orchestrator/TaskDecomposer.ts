/**
 * JARVIS Task Decomposer - Break Goals into Actionable Tasks
 *
 * Responsibilities:
 * 1. Analyze goal complexity and scope
 * 2. Break goals into micro-tasks with clear dependencies
 * 3. Estimate effort and time for each task
 * 4. Assign tasks to appropriate squads
 * 5. Create dependency graph for execution ordering
 * 6. Mark destructive operations requiring approval
 */

import { Goal } from './MasterOrchestrator'

export interface Task {
  id: string
  title: string
  description: string
  category: 'research' | 'design' | 'development' | 'testing' | 'documentation' | 'deployment' | 'review'
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependsOn: string[] // Array of task IDs that must complete first
  assignedSquads: string[]
  estimatedHours: number
  acceptanceCriteria: string[]
  isDestructive: boolean // Requires safety gate approval
  retries: number
  maxRetries: number
}

export class TaskDecomposer {
  /**
   * Decompose a goal into actionable tasks
   */
  async decompose(goal: Goal, answers: Record<string, any>, squads: string[]): Promise<Task[]> {
    console.log(`\n📋 [TaskDecomposer] Decomposing goal: "${goal.originalIntent}"`)
    console.log(`   Complexity: ${goal.complexity}`)

    const tasks: Task[] = []
    let taskCounter = 1

    // Phase 1: Research & Planning
    if (this.needsResearch(goal)) {
      tasks.push(...this.createResearchTasks(goal, answers, taskCounter))
      taskCounter += this.createResearchTasks(goal, answers, taskCounter).length
    }

    // Phase 2: Design & Architecture
    if (this.needsDesign(goal)) {
      tasks.push(...this.createDesignTasks(goal, answers, squads, taskCounter))
      taskCounter += this.createDesignTasks(goal, answers, squads, taskCounter).length
    }

    // Phase 3: Development & Implementation
    if (this.needsDevelopment(goal)) {
      tasks.push(...this.createDevelopmentTasks(goal, answers, squads, taskCounter))
      taskCounter += this.createDevelopmentTasks(goal, answers, squads, taskCounter).length
    }

    // Phase 4: Testing & Validation
    if (goal.complexity !== 'simple') {
      tasks.push(...this.createTestingTasks(goal, answers, taskCounter))
      taskCounter += this.createTestingTasks(goal, answers, taskCounter).length
    }

    // Phase 5: Deployment & Release
    if (goal.category === 'technical' || goal.category === 'business') {
      tasks.push(...this.createDeploymentTasks(goal, answers, taskCounter))
      taskCounter += this.createDeploymentTasks(goal, answers, taskCounter).length
    }

    // Phase 6: Documentation
    tasks.push(...this.createDocumentationTasks(goal, answers, taskCounter))

    console.log(`   Created ${tasks.length} tasks across ${new Set(tasks.flatMap(t => t.assignedSquads)).size} squads`)
    console.log(`   Task priorities: ${this.getTaskDistribution(tasks)}`)

    return tasks
  }

  /**
   * Create research tasks
   */
  private createResearchTasks(goal: Goal, answers: Record<string, any>, baseId: number): Task[] {
    const tasks: Task[] = []

    if (goal.category === 'business' || goal.category === 'research') {
      tasks.push({
        id: `task-${baseId}`,
        title: 'Market & Competitive Research',
        description: `Research market landscape, competitors, and user trends for: "${goal.originalIntent}"`,
        category: 'research',
        priority: 'high',
        dependsOn: [],
        assignedSquads: ['oracle'],
        estimatedHours: this.estimateHours('research', goal.complexity),
        acceptanceCriteria: [
          'Competitive landscape mapped',
          'Market sizing completed',
          'User personas identified',
          'Trends and opportunities documented'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 2
      })
    }

    if (goal.category === 'technical') {
      tasks.push({
        id: `task-${baseId + 1}`,
        title: 'Technology Stack Research',
        description: 'Research and validate technology choices, dependencies, and integration patterns',
        category: 'research',
        priority: 'high',
        dependsOn: [],
        assignedSquads: ['oracle'],
        estimatedHours: this.estimateHours('research', goal.complexity),
        acceptanceCriteria: [
          'Technology options evaluated',
          'Pros/cons documented',
          'Community maturity assessed',
          'Integration feasibility validated'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 2
      })
    }

    return tasks
  }

  /**
   * Create design tasks
   */
  private createDesignTasks(goal: Goal, answers: Record<string, any>, squads: string[], baseId: number): Task[] {
    const tasks: Task[] = []

    if (goal.category === 'business') {
      tasks.push({
        id: `task-${baseId}`,
        title: 'Business Model & Strategy Design',
        description: 'Design business model, revenue streams, and go-to-market strategy',
        category: 'design',
        priority: 'critical',
        dependsOn: [],
        assignedSquads: ['strategy'],
        estimatedHours: this.estimateHours('design', goal.complexity),
        acceptanceCriteria: [
          'Business model canvas completed',
          'Revenue streams defined',
          'Market positioning clear',
          'GTM strategy documented'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 2
      })
    }

    if (goal.category === 'technical' && squads.includes('forge')) {
      tasks.push({
        id: `task-${baseId + 1}`,
        title: 'System Architecture Design',
        description: 'Design scalable, maintainable architecture for the system',
        category: 'design',
        priority: 'critical',
        dependsOn: [],
        assignedSquads: ['forge'],
        estimatedHours: this.estimateHours('design', goal.complexity),
        acceptanceCriteria: [
          'Architecture diagram created',
          'Component interactions documented',
          'Data flow mapped',
          'Scalability considerations addressed'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 2
      })

      if (squads.includes('data')) {
        tasks.push({
          id: `task-${baseId + 2}`,
          title: 'Database Schema Design',
          description: 'Design optimized database schema with proper indexing and relationships',
          category: 'design',
          priority: 'critical',
          dependsOn: [`task-${baseId + 1}`],
          assignedSquads: ['data'],
          estimatedHours: this.estimateHours('design', goal.complexity),
          acceptanceCriteria: [
            'ER diagram created',
            'Indexes planned',
            'Query patterns optimized',
            'Scalability verified'
          ],
          isDestructive: false,
          retries: 0,
          maxRetries: 2
        })
      }
    }

    if (squads.includes('nexus')) {
      tasks.push({
        id: `task-${baseId + 3}`,
        title: 'UI/UX Design',
        description: 'Design user interface and user experience with wireframes and prototypes',
        category: 'design',
        priority: 'high',
        dependsOn: [],
        assignedSquads: ['nexus'],
        estimatedHours: this.estimateHours('design', goal.complexity),
        acceptanceCriteria: [
          'Wireframes created',
          'User flows documented',
          'Design system established',
          'Accessibility requirements met'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 2
      })
    }

    return tasks
  }

  /**
   * Create development tasks
   */
  private createDevelopmentTasks(goal: Goal, answers: Record<string, any>, squads: string[], baseId: number): Task[] {
    const tasks: Task[] = []

    if (!squads.includes('forge')) return tasks

    // Backend development
    tasks.push({
      id: `task-${baseId}`,
      title: 'Backend API Implementation',
      description: 'Implement core backend APIs, business logic, and integrations',
      category: 'development',
      priority: 'critical',
      dependsOn: [], // Could depend on design tasks
      assignedSquads: ['forge'],
      estimatedHours: this.estimateHours('development', goal.complexity),
      acceptanceCriteria: [
        'All APIs implemented',
        'Business logic tested',
        'Error handling in place',
        'Logging and monitoring configured'
      ],
      isDestructive: false,
      retries: 0,
      maxRetries: 3
    })

    // Frontend development
    if (goal.originalIntent.toLowerCase().includes('ui') ||
        goal.originalIntent.toLowerCase().includes('web') ||
        goal.originalIntent.toLowerCase().includes('app')) {
      tasks.push({
        id: `task-${baseId + 1}`,
        title: 'Frontend UI Implementation',
        description: 'Build responsive, interactive frontend interface',
        category: 'development',
        priority: 'critical',
        dependsOn: [`task-${baseId}`], // Needs backend APIs ready
        assignedSquads: ['forge'],
        estimatedHours: this.estimateHours('development', goal.complexity),
        acceptanceCriteria: [
          'All pages/components implemented',
          'Responsive design validated',
          'API integration complete',
          'User experience smooth'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 3
      })
    }

    // Database implementation
    if (squads.includes('data')) {
      tasks.push({
        id: `task-${baseId + 2}`,
        title: 'Database Implementation & Migrations',
        description: 'Create database schema, migrations, and seed data',
        category: 'development',
        priority: 'critical',
        dependsOn: [],
        assignedSquads: ['data'],
        estimatedHours: this.estimateHours('development', 'moderate'),
        acceptanceCriteria: [
          'Schema created',
          'Migrations tested',
          'Indexes applied',
          'Seed data loaded'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 2
      })
    }

    // Integration tasks
    if (goal.originalIntent.toLowerCase().includes('integrat') ||
        goal.originalIntent.toLowerCase().includes('connect')) {
      tasks.push({
        id: `task-${baseId + 3}`,
        title: 'Third-Party Integrations',
        description: 'Implement integrations with external APIs and services',
        category: 'development',
        priority: 'high',
        dependsOn: [`task-${baseId}`],
        assignedSquads: ['forge'],
        estimatedHours: this.estimateHours('development', goal.complexity),
        acceptanceCriteria: [
          'All integrations implemented',
          'Error handling robust',
          'Rate limiting handled',
          'Authentication secured'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 3
      })
    }

    return tasks
  }

  /**
   * Create testing tasks
   */
  private createTestingTasks(goal: Goal, answers: Record<string, any>, baseId: number): Task[] {
    const tasks: Task[] = []

    // Unit testing
    tasks.push({
      id: `task-${baseId}`,
      title: 'Unit & Integration Testing',
      description: 'Write comprehensive unit and integration tests',
      category: 'testing',
      priority: 'high',
      dependsOn: [], // Runs in parallel with development
      assignedSquads: ['forge'],
      estimatedHours: this.estimateHours('testing', goal.complexity),
      acceptanceCriteria: [
        '80%+ code coverage achieved',
        'All critical paths tested',
        'Edge cases covered',
        'Tests automated'
      ],
      isDestructive: false,
      retries: 0,
      maxRetries: 2
    })

    // Performance testing
    if (goal.complexity === 'complex' || goal.complexity === 'enterprise') {
      tasks.push({
        id: `task-${baseId + 1}`,
        title: 'Performance & Load Testing',
        description: 'Validate system performance under load',
        category: 'testing',
        priority: 'high',
        dependsOn: [`task-${baseId}`],
        assignedSquads: ['forge'],
        estimatedHours: this.estimateHours('testing', 'moderate'),
        acceptanceCriteria: [
          'Load testing completed',
          'Bottlenecks identified',
          'Optimizations applied',
          'SLAs met'
        ],
        isDestructive: false,
        retries: 0,
        maxRetries: 2
      })
    }

    // Security testing
    tasks.push({
      id: `task-${baseId + 2}`,
      title: 'Security & Compliance Testing',
      description: 'Validate security measures and compliance requirements',
      category: 'testing',
      priority: 'critical',
      dependsOn: [`task-${baseId}`],
      assignedSquads: ['forge'],
      estimatedHours: this.estimateHours('testing', 'moderate'),
      acceptanceCriteria: [
        'Security scan passed',
        'OWASP top 10 addressed',
        'Data protection validated',
        'Compliance verified'
      ],
      isDestructive: false,
      retries: 0,
      maxRetries: 2
    })

    return tasks
  }

  /**
   * Create deployment tasks
   */
  private createDeploymentTasks(goal: Goal, answers: Record<string, any>, baseId: number): Task[] {
    const tasks: Task[] = []

    tasks.push({
      id: `task-${baseId}`,
      title: 'Infrastructure Setup & Deployment',
      description: 'Set up infrastructure, CI/CD pipelines, and deploy to production',
      category: 'deployment',
      priority: 'critical',
      dependsOn: [],
      assignedSquads: ['devops'],
      estimatedHours: this.estimateHours('deployment', goal.complexity),
      acceptanceCriteria: [
        'Infrastructure provisioned',
        'CI/CD pipeline configured',
        'Deployments automated',
        'Monitoring activated'
      ],
      isDestructive: true, // Requires approval for production
      retries: 0,
      maxRetries: 2
    })

    tasks.push({
      id: `task-${baseId + 1}`,
      title: 'Production Rollout',
      description: 'Execute production rollout with monitoring and rollback plan',
      category: 'deployment',
      priority: 'critical',
      dependsOn: [`task-${baseId}`],
      assignedSquads: ['devops'],
      estimatedHours: 4,
      acceptanceCriteria: [
        'Deployment successful',
        'Health checks pass',
        'Monitoring confirms stability',
        'Rollback procedure ready'
      ],
      isDestructive: true, // Production change
      retries: 0,
      maxRetries: 1
    })

    return tasks
  }

  /**
   * Create documentation tasks
   */
  private createDocumentationTasks(goal: Goal, answers: Record<string, any>, baseId: number): Task[] {
    const tasks: Task[] = []

    tasks.push({
      id: `task-${baseId}`,
      title: 'Technical Documentation',
      description: 'Write comprehensive technical documentation, API docs, and architecture guides',
      category: 'documentation',
      priority: 'medium',
      dependsOn: [],
      assignedSquads: ['mercury'],
      estimatedHours: this.estimateHours('documentation', goal.complexity),
      acceptanceCriteria: [
        'API documentation complete',
        'Architecture guide written',
        'Setup instructions clear',
        'Troubleshooting guide included'
      ],
      isDestructive: false,
      retries: 0,
      maxRetries: 1
    })

    tasks.push({
      id: `task-${baseId + 1}`,
      title: 'User Documentation & Training',
      description: 'Create user guides, tutorials, and training materials',
      category: 'documentation',
      priority: 'medium',
      dependsOn: [`task-${baseId}`],
      assignedSquads: ['mercury'],
      estimatedHours: this.estimateHours('documentation', 'moderate'),
      acceptanceCriteria: [
        'User guides written',
        'Video tutorials created',
        'FAQ documented',
        'Support procedures defined'
      ],
      isDestructive: false,
      retries: 0,
      maxRetries: 1
    })

    return tasks
  }

  /**
   * Determine if goal needs research phase
   */
  private needsResearch(goal: Goal): boolean {
    return goal.category === 'business' ||
           goal.category === 'research' ||
           goal.complexity === 'complex' ||
           goal.complexity === 'enterprise'
  }

  /**
   * Determine if goal needs design phase
   */
  private needsDesign(goal: Goal): boolean {
    return goal.complexity !== 'simple'
  }

  /**
   * Determine if goal needs development phase
   */
  private needsDevelopment(goal: Goal): boolean {
    return goal.category === 'technical' ||
           goal.category === 'business' ||
           goal.originalIntent.toLowerCase().includes('build') ||
           goal.originalIntent.toLowerCase().includes('create') ||
           goal.originalIntent.toLowerCase().includes('develop')
  }

  /**
   * Estimate hours for task based on category and complexity
   */
  private estimateHours(category: string, complexity: string): number {
    const baseHours: Record<string, Record<string, number>> = {
      research: {
        simple: 4,
        moderate: 8,
        complex: 16,
        enterprise: 24
      },
      design: {
        simple: 4,
        moderate: 12,
        complex: 24,
        enterprise: 40
      },
      development: {
        simple: 8,
        moderate: 24,
        complex: 48,
        enterprise: 80
      },
      testing: {
        simple: 4,
        moderate: 12,
        complex: 20,
        enterprise: 32
      },
      deployment: {
        simple: 2,
        moderate: 4,
        complex: 8,
        enterprise: 12
      },
      documentation: {
        simple: 2,
        moderate: 6,
        complex: 12,
        enterprise: 20
      }
    }

    return baseHours[category]?.[complexity] || 8
  }

  /**
   * Get distribution of task priorities
   */
  private getTaskDistribution(tasks: Task[]): string {
    const dist = {
      critical: tasks.filter(t => t.priority === 'critical').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    }

    return `Critical: ${dist.critical}, High: ${dist.high}, Medium: ${dist.medium}, Low: ${dist.low}`
  }

  /**
   * Validate task dependencies (detect cycles)
   */
  validateDependencies(tasks: Task[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (taskId: string): boolean => {
      visited.add(taskId)
      recursionStack.add(taskId)

      const task = tasks.find(t => t.id === taskId)
      if (!task) return false

      for (const depId of task.dependsOn) {
        if (!visited.has(depId) && hasCycle(depId)) {
          return true
        } else if (recursionStack.has(depId)) {
          errors.push(`Circular dependency detected: ${taskId} → ${depId}`)
          return true
        }
      }

      recursionStack.delete(taskId)
      return false
    }

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        hasCycle(task.id)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export default TaskDecomposer
