/**
 * JARVIS Master Orchestrator - Main Brain
 *
 * Responsibilities:
 * 1. Parse user goals/intents
 * 2. Ask clarifying questions interactively
 * 3. Create squads dynamically for needed areas
 * 4. Decompose goals into actionable tasks
 * 5. Assign tasks to agents with dependencies
 * 6. Monitor execution in real-time
 * 7. Handle failures and adapt
 * 8. Merge results into unified output
 */

import { EventEmitter } from 'events'
import { TaskDecomposer } from './TaskDecomposer'
import { SquadCreator } from './SquadCreator'
import { AgentCoordinator } from './AgentCoordinator'
import { SafetyGate } from './SafetyGate'
import { ProgressTracker } from './ProgressTracker'
import { ResultMerger } from './ResultMerger'

export interface Goal {
  id: string
  originalIntent: string
  parsedGoal: string
  category: 'business' | 'technical' | 'research' | 'content' | 'custom'
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise'
  estimatedTime: number // minutes
  budget?: number
  constraints?: string[]
}

export interface ClarifyingQuestion {
  id: string
  question: string
  type: 'text' | 'multiselect' | 'number' | 'boolean'
  required: boolean
  options?: string[]
}

export interface OrchestrationContext {
  goal: Goal
  answers: Record<string, any>
  squads: string[]
  tasks: any[]
  assignments: Map<string, string[]> // taskId -> [agentId]
  progress: Map<string, number> // taskId -> percentage
  results: Map<string, any> // taskId -> result
}

export class MasterOrchestrator extends EventEmitter {
  private decomposer: TaskDecomposer
  private squadCreator: SquadCreator
  private coordinator: AgentCoordinator
  private safetyGate: SafetyGate
  private progressTracker: ProgressTracker
  private resultMerger: ResultMerger
  private activeOrchestrations: Map<string, OrchestrationContext> = new Map()

  constructor() {
    super()
    this.decomposer = new TaskDecomposer()
    this.squadCreator = new SquadCreator()
    this.coordinator = new AgentCoordinator()
    this.safetyGate = new SafetyGate()
    this.progressTracker = new ProgressTracker()
    this.resultMerger = new ResultMerger()

    this.setupEventListeners()
  }

  /**
   * Main entry point: Execute a user goal
   *
   * Example: "Build me a tech company"
   */
  async executeGoal(intent: string, userId: string): Promise<any> {
    console.log(`🧠 [MasterOrchestrator] Processing goal: "${intent}"`)

    // Generate unique ID for this orchestration
    const orchestrationId = `orch-${Date.now()}`

    try {
      // Step 1: Parse intent into structured goal
      const goal = await this.parseIntent(intent)

      // Step 2: Ask clarifying questions
      const answers = await this.gatherContext(goal, userId)

      // Step 3: Create context
      const context: OrchestrationContext = {
        goal,
        answers,
        squads: [],
        tasks: [],
        assignments: new Map(),
        progress: new Map(),
        results: new Map()
      }

      this.activeOrchestrations.set(orchestrationId, context)

      // Step 4: Suggest and create squads
      context.squads = await this.squadCreator.suggestAndCreate(goal, answers)
      console.log(`✅ Created squads: ${context.squads.join(', ')}`)

      // Step 5: Decompose goal into tasks
      context.tasks = await this.decomposer.decompose(goal, answers, context.squads)
      console.log(`✅ Generated ${context.tasks.length} tasks`)

      // Step 6: Match agents to tasks
      context.assignments = await this.coordinator.matchAgentsToTasks(
        context.tasks,
        context.squads
      )
      console.log(`✅ Assigned ${context.assignments.size} tasks to agents`)

      // Step 7: Execute tasks with dependencies
      const finalResult = await this.executeOrchestration(orchestrationId)

      this.activeOrchestrations.delete(orchestrationId)
      return finalResult

    } catch (error) {
      console.error(`❌ [MasterOrchestrator] Orchestration failed:`, error)
      throw error
    }
  }

  /**
   * Step 1: Parse user intent into structured goal
   */
  private async parseIntent(intent: string): Promise<Goal> {
    // Use NLU to classify goal
    const category = this.classifyIntent(intent)
    const complexity = this.estimateComplexity(intent)
    const estimatedTime = this.estimateTime(complexity)

    return {
      id: `goal-${Date.now()}`,
      originalIntent: intent,
      parsedGoal: intent,
      category,
      complexity,
      estimatedTime,
      constraints: this.extractConstraints(intent)
    }
  }

  /**
   * Step 2: Ask clarifying questions based on goal type
   */
  private async gatherContext(goal: Goal, userId: string): Promise<Record<string, any>> {
    const questions = this.generateQuestions(goal)
    console.log(`❓ [MasterOrchestrator] Asking ${questions.length} clarifying questions...`)

    // Emit to frontend for user interaction
    this.emit('clarifying-questions', {
      goalId: goal.id,
      questions,
      userId
    })

    // Wait for answers (in real implementation, this comes from user)
    const answers = await this.waitForAnswers(goal.id, userId)
    return answers
  }

  /**
   * Execute orchestration with all tasks and agents
   */
  private async executeOrchestration(orchestrationId: string): Promise<any> {
    const context = this.activeOrchestrations.get(orchestrationId)!

    console.log(`\n${'='.repeat(70)}`)
    console.log(`🚀 STARTING ORCHESTRATION: ${context.goal.originalIntent}`)
    console.log(`   Complexity: ${context.goal.complexity}`)
    console.log(`   Est. Time: ${context.goal.estimatedTime} min`)
    console.log(`   Squads: ${context.squads.join(', ')}`)
    console.log(`   Tasks: ${context.tasks.length}`)
    console.log(`${'='.repeat(70)}\n`)

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(context.tasks)

    // Execute tasks respecting dependencies
    const executedTasks = new Set<string>()
    const maxIterations = context.tasks.length + 5
    let iteration = 0

    while (executedTasks.size < context.tasks.length && iteration < maxIterations) {
      iteration++

      // Find tasks ready to execute (all dependencies satisfied)
      const readyTasks = context.tasks.filter(task =>
        !executedTasks.has(task.id) &&
        (dependencyGraph.get(task.id) || []).every(dep => executedTasks.has(dep))
      )

      if (readyTasks.length === 0 && executedTasks.size < context.tasks.length) {
        console.error('❌ Circular dependency detected or no executable tasks!')
        break
      }

      // Execute ready tasks in parallel
      const taskPromises = readyTasks.map(task =>
        this.executeTask(orchestrationId, task)
      )

      const results = await Promise.allSettled(taskPromises)

      // Mark tasks as executed
      results.forEach((result, index) => {
        executedTasks.add(readyTasks[index].id)
      })

      // Report progress
      const progress = (executedTasks.size / context.tasks.length) * 100
      console.log(`📊 Progress: ${executedTasks.size}/${context.tasks.length} tasks (${progress.toFixed(0)}%)`)
    }

    // Merge all results
    const finalResult = await this.resultMerger.merge(
      context.tasks,
      context.results,
      context.goal
    )

    console.log(`\n✅ ORCHESTRATION COMPLETE!`)
    console.log(`   Total Tasks: ${context.tasks.length}`)
    console.log(`   Completed: ${executedTasks.size}`)
    console.log(`${'='.repeat(70)}\n`)

    return finalResult
  }

  /**
   * Execute individual task with assigned agents
   */
  private async executeTask(orchestrationId: string, task: any): Promise<any> {
    const context = this.activeOrchestrations.get(orchestrationId)!
    const agents = context.assignments.get(task.id) || []

    if (agents.length === 0) {
      throw new Error(`No agents assigned to task: ${task.id}`)
    }

    console.log(`\n📋 Executing: ${task.title}`)
    console.log(`   Assigned to: ${agents.join(', ')}`)
    console.log(`   Priority: ${task.priority}`)

    // Check safety gates if task is destructive
    if (task.isDestructive) {
      const approved = await this.safetyGate.requestPermission(task)
      if (!approved) {
        throw new Error(`Permission denied for task: ${task.id}`)
      }
    }

    // Broadcast task to all assigned agents (parallel execution)
    const agentPromises = agents.map(agent =>
      this.coordinator.executeWithAgent(agent, task)
    )

    try {
      const agentResults = await Promise.allSettled(agentPromises)

      // Merge agent results
      const mergedResult = await this.resultMerger.mergeAgentResults(
        agents,
        agentResults.map(r => r.status === 'fulfilled' ? r.value : r.reason),
        task
      )

      // Store result
      context.results.set(task.id, mergedResult)

      // Update progress
      this.progressTracker.updateTaskProgress(orchestrationId, task.id, 100, 'completed')
      this.emit('task-complete', {
        taskId: task.id,
        agents: agents,
        result: mergedResult
      })

      return mergedResult

    } catch (error) {
      console.error(`❌ Task failed: ${task.id}`, error)

      // Implement retry logic for failed tasks
      if (task.retries < (task.maxRetries || 2)) {
        console.log(`⚠️  Retrying task: ${task.id} (${task.retries + 1}/${task.maxRetries})`)
        task.retries = (task.retries || 0) + 1
        return this.executeTask(orchestrationId, task)
      }

      throw error
    }
  }

  /**
   * Build dependency graph from tasks
   */
  private buildDependencyGraph(tasks: any[]): Map<string, string[]> {
    const graph = new Map<string, string[]>()

    tasks.forEach(task => {
      graph.set(task.id, task.dependsOn || [])
    })

    return graph
  }

  // ─────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────

  private classifyIntent(intent: string): Goal['category'] {
    const intent_lower = intent.toLowerCase()

    if (intent_lower.includes('business') || intent_lower.includes('company') || intent_lower.includes('startup')) {
      return 'business'
    }
    if (intent_lower.includes('code') || intent_lower.includes('build') || intent_lower.includes('develop')) {
      return 'technical'
    }
    if (intent_lower.includes('research') || intent_lower.includes('analyze')) {
      return 'research'
    }
    if (intent_lower.includes('write') || intent_lower.includes('document') || intent_lower.includes('content')) {
      return 'content'
    }
    return 'custom'
  }

  private estimateComplexity(intent: string): Goal['complexity'] {
    const wordCount = intent.split(' ').length
    const hasMultipleAreas = intent.split('and').length > 2 || intent.split(',').length > 2

    if (wordCount < 10 && !hasMultipleAreas) return 'simple'
    if (wordCount < 20 && !hasMultipleAreas) return 'moderate'
    if (hasMultipleAreas) return 'complex'
    return 'enterprise'
  }

  private estimateTime(complexity: Goal['complexity']): number {
    const estimates: Record<Goal['complexity'], number> = {
      'simple': 15,
      'moderate': 45,
      'complex': 120,
      'enterprise': 480
    }
    return estimates[complexity]
  }

  private extractConstraints(intent: string): string[] {
    const constraints: string[] = []

    if (intent.includes('quickly') || intent.includes('fast')) constraints.push('speed')
    if (intent.includes('cheap') || intent.includes('budget')) constraints.push('cost')
    if (intent.includes('professional') || intent.includes('enterprise')) constraints.push('quality')
    if (intent.includes('asap') || intent.includes('urgent')) constraints.push('urgent')

    return constraints
  }

  private generateQuestions(goal: Goal): ClarifyingQuestion[] {
    const baseQuestions: ClarifyingQuestion[] = [
      {
        id: 'budget',
        question: 'What\'s your budget for this project?',
        type: 'multiselect',
        options: ['No specific budget', '$1K-$5K', '$5K-$25K', '$25K-$100K', '$100K+'],
        required: true
      },
      {
        id: 'timeline',
        question: 'What\'s your timeline?',
        type: 'multiselect',
        options: ['ASAP (1-2 weeks)', '1 month', '3 months', '6 months', 'No deadline'],
        required: true
      },
      {
        id: 'teamSize',
        question: 'What\'s your team size?',
        type: 'multiselect',
        options: ['Solo', '2-3 people', '5-10 people', '10+ people'],
        required: true
      }
    ]

    // Add category-specific questions
    switch (goal.category) {
      case 'business':
        baseQuestions.push({
          id: 'targetMarket',
          question: 'Who is your target market?',
          type: 'text',
          required: true
        })
        baseQuestions.push({
          id: 'businessModel',
          question: 'What\'s your business model? (B2B SaaS, B2C, Marketplace, etc.)',
          type: 'text',
          required: true
        })
        break

      case 'technical':
        baseQuestions.push({
          id: 'techStack',
          question: 'Any tech stack preferences?',
          type: 'text',
          required: false
        })
        baseQuestions.push({
          id: 'deployment',
          question: 'Where should this be deployed?',
          type: 'multiselect',
          options: ['Cloud (AWS/GCP/Azure)', 'Self-hosted', 'Local', 'Hybrid'],
          required: true
        })
        break

      case 'research':
        baseQuestions.push({
          id: 'scope',
          question: 'What\'s the research scope?',
          type: 'text',
          required: true
        })
        baseQuestions.push({
          id: 'depth',
          question: 'Research depth needed?',
          type: 'multiselect',
          options: ['Quick summary', 'Moderate depth', 'Very thorough', 'Academic rigor'],
          required: true
        })
        break
    }

    return baseQuestions
  }

  private async waitForAnswers(goalId: string, userId: string): Promise<Record<string, any>> {
    // In real implementation, wait for Socket.IO response from frontend
    // For now, return mock answers
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          budget: '$25K-$100K',
          timeline: '3 months',
          teamSize: '2-3 people',
          targetMarket: 'B2B SaaS for startups',
          businessModel: 'Subscription-based SaaS',
          techStack: 'TypeScript, React, Node.js',
          deployment: 'Cloud (AWS)'
        })
      }, 100)
    })
  }

  private setupEventListeners() {
    // Listen for task completion, errors, etc.
    this.on('task-complete', (data) => {
      console.log(`✅ Task completed: ${data.taskId}`)
    })

    this.on('task-error', (data) => {
      console.error(`❌ Task error: ${data.taskId}`, data.error)
    })
  }
}

export default MasterOrchestrator
