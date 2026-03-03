/**
 * JARVIS Safety Gate - Permission System for Destructive Operations
 *
 * Responsibilities:
 * 1. Identify destructive operations (delete, modify, deploy)
 * 2. Request permission before executing
 * 3. Track authorization history and audit log
 * 4. Implement approval workflows
 * 5. Enforce constraints based on operation type
 */

import { EventEmitter } from 'events'

export interface DestructiveOperation {
  id: string
  type: 'delete' | 'modify' | 'deploy' | 'reset' | 'rollback'
  resource: string
  scope: 'file' | 'database' | 'deployment' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedCount?: number
  taskId: string
  agentId: string
  createdAt: Date
}

export interface PermissionRequest {
  id: string
  operation: DestructiveOperation
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  requiredApprovals: number
  approvals: {
    approvedBy: string
    approvedAt: Date
    reason?: string
  }[]
  rejections: {
    rejectedBy: string
    rejectedAt: Date
    reason: string
  }[]
  expiresAt: Date
  createdAt: Date
}

export class SafetyGate extends EventEmitter {
  private permissionRequests: Map<string, PermissionRequest> = new Map()
  private auditLog: any[] = []
  private approvalThresholds: Record<string, number> = {
    delete: 2, // Require 2 approvals for file deletion
    modify: 1, // Require 1 approval for modifications
    deploy: 2, // Require 2 approvals for deployment
    reset: 3, // Require 3 approvals for system reset
    rollback: 2 // Require 2 approvals for rollback
  }

  constructor() {
    super()
  }

  /**
   * Request permission for a destructive operation
   */
  async requestPermission(task: any): Promise<boolean> {
    // Determine if operation is destructive
    if (!task.isDestructive) {
      return true
    }

    const operation: DestructiveOperation = {
      id: `op-${Date.now()}`,
      type: this.classifyOperationType(task),
      resource: this.extractResource(task),
      scope: this.classifyScope(task),
      severity: this.assessSeverity(task),
      description: task.description,
      affectedCount: task.affectedCount || 1,
      taskId: task.id,
      agentId: 'system', // Would come from agent context
      createdAt: new Date()
    }

    return await this.createPermissionRequest(operation)
  }

  /**
   * Create a permission request for an operation
   */
  private async createPermissionRequest(operation: DestructiveOperation): Promise<boolean> {
    const permissionId = `perm-${Date.now()}`

    const request: PermissionRequest = {
      id: permissionId,
      operation,
      status: 'pending',
      requiredApprovals: this.approvalThresholds[operation.type] || 2,
      approvals: [],
      rejections: [],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      createdAt: new Date()
    }

    this.permissionRequests.set(permissionId, request)

    console.log(`\n🔐 [SafetyGate] Permission Required`)
    console.log(`   Operation: ${operation.type.toUpperCase()}`)
    console.log(`   Resource: ${operation.resource}`)
    console.log(`   Severity: ${operation.severity.toUpperCase()}`)
    console.log(`   Affected: ${operation.affectedCount} item(s)`)
    console.log(`   Requires: ${request.requiredApprovals} approval(s)`)
    console.log(`   Request ID: ${permissionId}`)

    // Emit event for UI to show permission prompt
    this.emit('permission-request', {
      id: permissionId,
      operation,
      expiresAt: request.expiresAt
    })

    // Wait for approvals (with timeout)
    return await this.waitForApproval(permissionId, request.expiresAt)
  }

  /**
   * Approve a permission request
   */
  async approvePermission(permissionId: string, approvedBy: string, reason?: string): Promise<void> {
    const request = this.permissionRequests.get(permissionId)

    if (!request) {
      throw new Error(`Permission request not found: ${permissionId}`)
    }

    if (request.status !== 'pending') {
      throw new Error(`Permission request already ${request.status}`)
    }

    // Check expiration
    if (new Date() > request.expiresAt) {
      request.status = 'expired'
      throw new Error('Permission request expired')
    }

    // Record approval
    request.approvals.push({
      approvedBy,
      approvedAt: new Date(),
      reason
    })

    // Check if sufficient approvals obtained
    if (request.approvals.length >= request.requiredApprovals) {
      request.status = 'approved'

      this.logAudit({
        eventType: 'PERMISSION_APPROVED',
        permissionId,
        operation: request.operation,
        approvalCount: request.approvals.length,
        timestamp: new Date()
      })

      console.log(`   ✅ Approved by ${approvedBy} (${request.approvals.length}/${request.requiredApprovals})`)

      this.emit('permission-approved', permissionId)
    } else {
      console.log(`   ⏳ Approved by ${approvedBy} (${request.approvals.length}/${request.requiredApprovals})`)
    }
  }

  /**
   * Reject a permission request
   */
  async rejectPermission(permissionId: string, rejectedBy: string, reason: string): Promise<void> {
    const request = this.permissionRequests.get(permissionId)

    if (!request) {
      throw new Error(`Permission request not found: ${permissionId}`)
    }

    if (request.status !== 'pending') {
      throw new Error(`Permission request already ${request.status}`)
    }

    request.status = 'rejected'
    request.rejections.push({
      rejectedBy,
      rejectedAt: new Date(),
      reason
    })

    this.logAudit({
      eventType: 'PERMISSION_REJECTED',
      permissionId,
      operation: request.operation,
      rejectedBy,
      reason,
      timestamp: new Date()
    })

    console.log(`   ❌ Rejected by ${rejectedBy}: ${reason}`)

    this.emit('permission-rejected', permissionId)
  }

  /**
   * Wait for permission approval with timeout
   */
  private waitForApproval(permissionId: string, expiresAt: Date): Promise<boolean> {
    return new Promise((resolve) => {
      const request = this.permissionRequests.get(permissionId)!

      const timeout = setTimeout(() => {
        request.status = 'expired'
        console.log(`   ⏰ Permission request expired`)
        resolve(false)
      }, expiresAt.getTime() - Date.now())

      const approvalListener = (id: string) => {
        if (id === permissionId) {
          clearTimeout(timeout)
          this.off('permission-approved', approvalListener)
          this.off('permission-rejected', rejectionListener)
          resolve(true)
        }
      }

      const rejectionListener = (id: string) => {
        if (id === permissionId) {
          clearTimeout(timeout)
          this.off('permission-approved', approvalListener)
          this.off('permission-rejected', rejectionListener)
          resolve(false)
        }
      }

      this.on('permission-approved', approvalListener)
      this.on('permission-rejected', rejectionListener)
    })
  }

  /**
   * Classify operation type
   */
  private classifyOperationType(
    task: any
  ): 'delete' | 'modify' | 'deploy' | 'reset' | 'rollback' {
    const title = task.title.toLowerCase()
    const description = task.description.toLowerCase()

    if (title.includes('delete') || description.includes('delete')) {
      return 'delete'
    }
    if (title.includes('deploy') || title.includes('release')) {
      return 'deploy'
    }
    if (title.includes('reset')) {
      return 'reset'
    }
    if (title.includes('rollback')) {
      return 'rollback'
    }
    if (title.includes('modify') || title.includes('update')) {
      return 'modify'
    }

    return 'modify'
  }

  /**
   * Extract resource from task
   */
  private extractResource(task: any): string {
    // Extract from task properties or description
    const description = task.description.toLowerCase()

    if (description.includes('production')) return 'Production'
    if (description.includes('database')) return 'Database'
    if (description.includes('file')) return 'File System'
    if (description.includes('cache')) return 'Cache'
    if (description.includes('deploy')) return 'Deployment'

    return task.title || 'Unknown'
  }

  /**
   * Classify operation scope
   */
  private classifyScope(task: any): 'file' | 'database' | 'deployment' | 'system' {
    const content = `${task.title} ${task.description}`.toLowerCase()

    if (content.includes('database') || content.includes('schema')) {
      return 'database'
    }
    if (content.includes('deploy') || content.includes('production')) {
      return 'deployment'
    }
    if (content.includes('system') || content.includes('reset')) {
      return 'system'
    }

    return 'file'
  }

  /**
   * Assess operation severity
   */
  private assessSeverity(task: any): 'low' | 'medium' | 'high' | 'critical' {
    const content = `${task.title} ${task.description}`.toLowerCase()
    const priority = task.priority || 'medium'

    // Critical: production, system-wide, irreversible
    if (
      content.includes('production') ||
      content.includes('system reset') ||
      (content.includes('delete') && content.includes('all'))
    ) {
      return 'critical'
    }

    // High: data loss, deployment, significant impact
    if (
      content.includes('delete') ||
      content.includes('deploy') ||
      priority === 'critical'
    ) {
      return 'high'
    }

    // Medium: modifications, updates
    if (content.includes('modify') || content.includes('update')) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Get permission request status
   */
  getPermissionStatus(permissionId: string): PermissionRequest | undefined {
    return this.permissionRequests.get(permissionId)
  }

  /**
   * Get all pending permission requests
   */
  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.permissionRequests.values()).filter(r => r.status === 'pending')
  }

  /**
   * Get audit log for operation
   */
  getAuditLog(filter?: { taskId?: string; agentId?: string; type?: string }): any[] {
    if (!filter) {
      return this.auditLog
    }

    return this.auditLog.filter(entry => {
      if (filter.taskId && entry.operation?.taskId !== filter.taskId) return false
      if (filter.agentId && entry.operation?.agentId !== filter.agentId) return false
      if (filter.type && entry.eventType !== filter.type) return false
      return true
    })
  }

  /**
   * Log audit entry
   */
  private logAudit(entry: any): void {
    const auditEntry = {
      ...entry,
      id: `audit-${Date.now()}`,
      timestamp: new Date()
    }

    this.auditLog.push(auditEntry)

    // Keep audit log size manageable (last 1000 entries)
    if (this.auditLog.length > 1000) {
      this.auditLog.shift()
    }

    // Log to console
    console.log(`\n📋 [SafetyGate Audit] ${auditEntry.eventType}`)
    console.log(`   Timestamp: ${auditEntry.timestamp.toISOString()}`)
    if (auditEntry.operation) {
      console.log(`   Operation: ${auditEntry.operation.type} on ${auditEntry.operation.resource}`)
      console.log(`   Severity: ${auditEntry.operation.severity}`)
    }
  }

  /**
   * Validate operation can be executed
   */
  validateOperation(operation: DestructiveOperation): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check severity level constraints
    if (operation.severity === 'critical') {
      if (operation.affectedCount! > 100) {
        errors.push('Critical operations affecting >100 items require executive approval')
      }
    }

    // Check scope constraints
    if (operation.scope === 'system') {
      errors.push('System-wide operations require special approval')
    }

    // Check deployment constraints
    if (operation.type === 'deploy') {
      if (!operation.description.includes('rollback')) {
        errors.push('Deployment must include rollback procedure')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Require confirmation for batch operations
   */
  requireBatchConfirmation(affectedCount: number): boolean {
    // Require confirmation if affecting more than 10 items
    return affectedCount > 10
  }

  /**
   * Clear permission request (cleanup)
   */
  clearPermission(permissionId: string): void {
    this.permissionRequests.delete(permissionId)
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalRequests: number
    approvedCount: number
    rejectedCount: number
    expiredCount: number
    pendingCount: number
  } {
    const requests = Array.from(this.permissionRequests.values())

    return {
      totalRequests: requests.length,
      approvedCount: requests.filter(r => r.status === 'approved').length,
      rejectedCount: requests.filter(r => r.status === 'rejected').length,
      expiredCount: requests.filter(r => r.status === 'expired').length,
      pendingCount: requests.filter(r => r.status === 'pending').length
    }
  }
}

export default SafetyGate
