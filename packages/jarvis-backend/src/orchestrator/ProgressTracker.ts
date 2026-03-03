/**
 * JARVIS Progress Tracker - Real-time Execution Monitoring
 *
 * Responsibilities:
 * 1. Track task execution progress
 * 2. Monitor orchestration timeline
 * 3. Report completion status and metrics
 * 4. Alert on delays and bottlenecks
 * 5. Provide real-time dashboard updates
 */

import { EventEmitter } from 'events'

export interface ProgressMetrics {
  taskId: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  percentComplete: number
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
  estimatedTimeRemainingMs?: number
  lastUpdatedAt: Date
}

export interface OrchestrationMetrics {
  orchestrationId: string
  totalTasks: number
  completedTasks: number
  failedTasks: number
  inProgressTasks: number
  pendingTasks: number
  overallProgress: number // 0-100
  estimatedTimeRemaining: number // minutes
  bottlenecks: string[]
  startedAt: Date
  currentTime: Date
}

export class ProgressTracker extends EventEmitter {
  private taskProgress: Map<string, ProgressMetrics> = new Map()
  private orchestrationMetrics: Map<string, OrchestrationMetrics> = new Map()
  private updateInterval: NodeJS.Timeout | null = null
  private checkInterval = 5000 // Update every 5 seconds

  constructor() {
    super()
  }

  /**
   * Initialize tracking for orchestration
   */
  initializeOrchestration(orchestrationId: string, totalTasks: number): void {
    const metrics: OrchestrationMetrics = {
      orchestrationId,
      totalTasks,
      completedTasks: 0,
      failedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: totalTasks,
      overallProgress: 0,
      estimatedTimeRemaining: 0,
      bottlenecks: [],
      startedAt: new Date(),
      currentTime: new Date()
    }

    this.orchestrationMetrics.set(orchestrationId, metrics)

    console.log(`\n📊 [ProgressTracker] Initialized tracking for orchestration: ${orchestrationId}`)
    console.log(`   Total tasks: ${totalTasks}`)

    // Start periodic metric updates
    if (!this.updateInterval) {
      this.startMetricUpdates()
    }
  }

  /**
   * Update task progress
   */
  updateTaskProgress(
    orchestrationId: string,
    taskId: string,
    percentComplete: number,
    status: 'pending' | 'in-progress' | 'completed' | 'failed'
  ): void {
    let metrics = this.taskProgress.get(taskId)

    if (!metrics) {
      metrics = {
        taskId,
        status: 'pending',
        percentComplete: 0,
        lastUpdatedAt: new Date()
      }
      this.taskProgress.set(taskId, metrics)
    }

    const previousStatus = metrics.status
    metrics.status = status
    metrics.percentComplete = percentComplete
    metrics.lastUpdatedAt = new Date()

    // Record timing
    if (status === 'in-progress' && !metrics.startedAt) {
      metrics.startedAt = new Date()
    }

    if ((status === 'completed' || status === 'failed') && !metrics.completedAt) {
      metrics.completedAt = new Date()
      if (metrics.startedAt) {
        metrics.durationMs = metrics.completedAt.getTime() - metrics.startedAt.getTime()
      }
    }

    // Update orchestration metrics
    this.updateOrchestrationMetrics(orchestrationId)

    // Log status changes
    if (previousStatus !== status) {
      this.logStatusChange(taskId, previousStatus, status)
    }

    // Emit progress event
    this.emit('task-progress', {
      taskId,
      status,
      percentComplete,
      metrics
    })
  }

  /**
   * Update orchestration-level metrics
   */
  private updateOrchestrationMetrics(orchestrationId: string): void {
    const orchestrationMetrics = this.orchestrationMetrics.get(orchestrationId)
    if (!orchestrationMetrics) return

    // Count task statuses
    const taskMetrics = Array.from(this.taskProgress.values())
    const completed = taskMetrics.filter(t => t.status === 'completed').length
    const failed = taskMetrics.filter(t => t.status === 'failed').length
    const inProgress = taskMetrics.filter(t => t.status === 'in-progress').length
    const pending = taskMetrics.filter(t => t.status === 'pending').length

    orchestrationMetrics.completedTasks = completed
    orchestrationMetrics.failedTasks = failed
    orchestrationMetrics.inProgressTasks = inProgress
    orchestrationMetrics.pendingTasks = pending
    orchestrationMetrics.currentTime = new Date()

    // Calculate overall progress
    const totalProgress = taskMetrics.reduce((sum, t) => sum + t.percentComplete, 0)
    orchestrationMetrics.overallProgress =
      orchestrationMetrics.totalTasks > 0 ? totalProgress / orchestrationMetrics.totalTasks : 0

    // Estimate time remaining
    orchestrationMetrics.estimatedTimeRemaining = this.estimateTimeRemaining(orchestrationId)

    // Identify bottlenecks
    orchestrationMetrics.bottlenecks = this.identifyBottlenecks(taskMetrics)
  }

  /**
   * Estimate time remaining for orchestration
   */
  private estimateTimeRemaining(orchestrationId: string): number {
    const orchestrationMetrics = this.orchestrationMetrics.get(orchestrationId)
    if (!orchestrationMetrics) return 0

    const completedTasks = Array.from(this.taskProgress.values()).filter(
      t => t.status === 'completed' && t.durationMs
    )

    if (completedTasks.length === 0) {
      // Assume average of 2 minutes per task
      const remainingTasks =
        orchestrationMetrics.totalTasks - orchestrationMetrics.completedTasks
      return remainingTasks * 2
    }

    // Calculate average task duration
    const totalDuration = completedTasks.reduce((sum, t) => sum + (t.durationMs || 0), 0)
    const avgDurationMs = totalDuration / completedTasks.length
    const remainingTasks =
      orchestrationMetrics.totalTasks - orchestrationMetrics.completedTasks

    // Convert to minutes
    return Math.ceil((remainingTasks * avgDurationMs) / 60000)
  }

  /**
   * Identify bottlenecks in task execution
   */
  private identifyBottlenecks(taskMetrics: ProgressMetrics[]): string[] {
    const bottlenecks: string[] = []

    // Find tasks taking longer than average
    const completedWithDuration = taskMetrics.filter(t => t.durationMs)
    if (completedWithDuration.length > 0) {
      const avgDuration =
        completedWithDuration.reduce((sum, t) => sum + (t.durationMs || 0), 0) /
        completedWithDuration.length

      for (const task of completedWithDuration) {
        if ((task.durationMs || 0) > avgDuration * 1.5) {
          bottlenecks.push(`${task.taskId} took ${(task.durationMs! / 1000).toFixed(1)}s`)
        }
      }
    }

    // Find long-running in-progress tasks
    const inProgressTasks = taskMetrics.filter(
      t => t.status === 'in-progress' && t.startedAt
    )

    const now = new Date()
    for (const task of inProgressTasks) {
      const elapsed = (now.getTime() - (task.startedAt?.getTime() || 0)) / 1000
      if (elapsed > 60) {
        bottlenecks.push(`${task.taskId} running for ${elapsed.toFixed(0)}s`)
      }
    }

    return bottlenecks.slice(0, 5) // Keep top 5 bottlenecks
  }

  /**
   * Start periodic metric updates
   */
  private startMetricUpdates(): void {
    this.updateInterval = setInterval(() => {
      // Update all orchestration metrics
      for (const [orchestrationId, _metrics] of this.orchestrationMetrics.entries()) {
        this.updateOrchestrationMetrics(orchestrationId)

        const orchestrationMetrics = this.orchestrationMetrics.get(orchestrationId)
        if (orchestrationMetrics) {
          this.emit('orchestration-update', orchestrationMetrics)
        }
      }
    }, this.checkInterval)
  }

  /**
   * Stop metric updates
   */
  stopMetricUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  /**
   * Get current task progress
   */
  getTaskProgress(taskId: string): ProgressMetrics | undefined {
    return this.taskProgress.get(taskId)
  }

  /**
   * Get all task progress
   */
  getAllTaskProgress(orchestrationId?: string): ProgressMetrics[] {
    return Array.from(this.taskProgress.values())
  }

  /**
   * Get orchestration metrics
   */
  getOrchestrationMetrics(orchestrationId: string): OrchestrationMetrics | undefined {
    return this.orchestrationMetrics.get(orchestrationId)
  }

  /**
   * Log status change
   */
  private logStatusChange(
    taskId: string,
    previousStatus: string,
    newStatus: string
  ): void {
    const statusEmojis: Record<string, string> = {
      pending: '⏳',
      'in-progress': '🔄',
      completed: '✅',
      failed: '❌'
    }

    console.log(
      `   ${statusEmojis[newStatus] || '•'} ${taskId}: ${previousStatus} → ${newStatus}`
    )
  }

  /**
   * Get progress summary
   */
  getProgressSummary(orchestrationId: string): string {
    const metrics = this.orchestrationMetrics.get(orchestrationId)
    if (!metrics) return 'Orchestration not found'

    const progressBar = this.createProgressBar(metrics.overallProgress)

    return `
┌─ Progress Summary ─────────────────┐
│ ${progressBar} ${metrics.overallProgress.toFixed(0)}%
│
│ Tasks: ${metrics.completedTasks}/${metrics.totalTasks} completed
│ Failed: ${metrics.failedTasks}
│ In Progress: ${metrics.inProgressTasks}
│ Pending: ${metrics.pendingTasks}
│
│ Est. Time Remaining: ${metrics.estimatedTimeRemaining} minutes
│ Elapsed Time: ${this.formatDuration(Date.now() - metrics.startedAt.getTime())}
${
  metrics.bottlenecks.length > 0
    ? `│
│ Bottlenecks:
${metrics.bottlenecks.map(b => `│  • ${b}`).join('\n')}
`
    : ''
}└────────────────────────────────────┘
    `
  }

  /**
   * Create progress bar visualization
   */
  private createProgressBar(progress: number, width = 20): string {
    const filledCount = Math.round((progress / 100) * width)
    const filled = '█'.repeat(filledCount)
    const empty = '░'.repeat(width - filledCount)

    return `[${filled}${empty}]`
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(durationMs: number): string {
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData(orchestrationId: string): any {
    const metrics = this.orchestrationMetrics.get(orchestrationId)
    const taskProgress = Array.from(this.taskProgress.values()).slice(0, 10) // Top 10 tasks

    return {
      orchestration: metrics,
      recentTasks: taskProgress.map(t => ({
        id: t.taskId,
        status: t.status,
        progress: t.percentComplete,
        duration: t.durationMs
      })),
      summary: {
        successRate:
          metrics && metrics.totalTasks > 0
            ? ((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(1)
            : '0',
        averageTaskDuration: this.getAverageTaskDuration()
      }
    }
  }

  /**
   * Get average task duration
   */
  private getAverageTaskDuration(): number {
    const completedWithDuration = Array.from(this.taskProgress.values()).filter(
      t => t.durationMs && t.status === 'completed'
    )

    if (completedWithDuration.length === 0) return 0

    const total = completedWithDuration.reduce((sum, t) => sum + (t.durationMs || 0), 0)

    return Math.round(total / completedWithDuration.length)
  }

  /**
   * Clear tracking for completed orchestration
   */
  clearOrchestration(orchestrationId: string): void {
    this.orchestrationMetrics.delete(orchestrationId)

    // Clear associated task progress
    for (const [taskId, metrics] of this.taskProgress.entries()) {
      // Could add orchestrationId to ProgressMetrics to properly associate
      // For now, clear completed tasks
      if (metrics.status === 'completed') {
        this.taskProgress.delete(taskId)
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalOrchestrations: number
    totalTasks: number
    completedTasks: number
    failedTasks: number
    averageTaskDuration: number
  } {
    const allTasks = Array.from(this.taskProgress.values())

    return {
      totalOrchestrations: this.orchestrationMetrics.size,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      failedTasks: allTasks.filter(t => t.status === 'failed').length,
      averageTaskDuration: this.getAverageTaskDuration()
    }
  }
}

export default ProgressTracker
