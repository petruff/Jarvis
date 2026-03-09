/**
 * Sandbox Validator — Phase 3.5
 *
 * Validates sandbox security across all agent execution domains:
 * - Code pattern detection (dangerous imports, system access)
 * - Data isolation verification
 * - Execution boundary enforcement
 * - Security policy compliance
 * - Audit trail maintenance
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SecurityViolation {
  id: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'code_pattern' | 'data_access' | 'privilege_boundary' | 'execution_escape';
  description: string;
  location: string;
  recommendation: string;
}

export interface SecurityAuditEntry {
  timestamp: string;
  agentId: string;
  action: 'code_analyzed' | 'execution_sandboxed' | 'violation_detected' | 'policy_enforced';
  status: 'success' | 'failure';
  details: string;
}

export interface SandboxSecurityReport {
  timestamp: string;
  totalViolations: number;
  criticalViolations: number;
  complianceScore: number; // 0-100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export class SandboxValidator {
  private violations: SecurityViolation[] = [];
  private auditLog: SecurityAuditEntry[] = [];
  private auditLogPath: string;

  private readonly dangerousPatterns = [
    { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, reason: 'Shell execution' },
    { pattern: /eval\s*\(/, reason: 'Dynamic code execution' },
    { pattern: /Function\s*\(/, reason: 'Dynamic function creation' },
    { pattern: /process\.exit/, reason: 'Process termination' },
    { pattern: /process\.kill/, reason: 'Process killing' },
    { pattern: /fs\.writeFile/, reason: 'File system write' },
    { pattern: /fs\.unlink/, reason: 'File system delete' },
    { pattern: /fs\.rmdir/, reason: 'Directory removal' },
    { pattern: /process\.chdir/, reason: 'Working directory change' },
    { pattern: /require\s*\(\s*['"]path['"]\s*\)/, reason: 'Path manipulation' },
    { pattern: /global\./, reason: 'Global scope manipulation' },
    { pattern: /__dirname/, reason: 'Directory traversal' },
    { pattern: /require\.extensions/, reason: 'Require overriding' },
    { pattern: /module\.prototype/, reason: 'Module system tampering' }
  ];

  constructor() {
    const dataDir = path.resolve(process.cwd(), '.jarvis');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.auditLogPath = path.join(dataDir, 'security-audit.jsonl');
    this.loadAuditLog();
  }

  /**
   * Load audit log from disk
   */
  private loadAuditLog(): void {
    try {
      if (fs.existsSync(this.auditLogPath)) {
        const content = fs.readFileSync(this.auditLogPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            this.auditLog.push(entry);
          } catch (e) {
            // Skip malformed lines
          }
        }
      }
    } catch (err: any) {
      console.warn(`[SANDBOX] Failed to load audit log: ${err.message}`);
    }
  }

  /**
   * Analyze code for security violations
   */
  analyzeCode(code: string, location: string, agentId: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    for (const { pattern, reason } of this.dangerousPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        const violation: SecurityViolation = {
          id: `violation-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          severity: 'high',
          type: 'code_pattern',
          description: `Detected dangerous pattern: ${reason}`,
          location,
          recommendation: `Remove or sandbox ${reason.toLowerCase()} operations`
        };
        violations.push(violation);
      }
    }

    // Record audit entry
    this.recordAudit(agentId, 'code_analyzed', violations.length === 0 ? 'success' : 'failure', `Analyzed code at ${location}, found ${violations.length} violations`);
    this.violations.push(...violations);

    return violations;
  }

  /**
   * Verify data isolation boundaries
   */
  verifyDataIsolation(agentId: string, accessedResources: string[]): {
    isolated: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    const allowedPatterns = [
      /^\.jarvis\/.*/, // JARVIS data directory
      /^memory\/.*/, // Memory systems
      /^\.cache\/.*/, // Cache directory
      /^logs\/.*/ // Logs directory
    ];

    for (const resource of accessedResources) {
      const allowed = allowedPatterns.some(p => p.test(resource));
      if (!allowed) {
        violations.push(`Unauthorized resource access: ${resource}`);
      }
    }

    const isolated = violations.length === 0;
    this.recordAudit(agentId, 'execution_sandboxed', isolated ? 'success' : 'failure', `Data isolation check: ${violations.join(', ') || 'OK'}`);

    return { isolated, violations };
  }

  /**
   * Validate privilege boundaries
   */
  validatePrivilegeBoundaries(agentId: string, requestedCapabilities: string[]): {
    authorized: boolean;
    deniedCapabilities: string[];
  } {
    const allowedCapabilities = [
      'memory_read',
      'memory_write',
      'episodic_recall',
      'semantic_query',
      'llm_call',
      'tool_use',
      'squad_dispatch',
      'metric_record',
      'log_write'
    ];

    const deniedCapabilities = requestedCapabilities.filter(cap => !allowedCapabilities.includes(cap));
    const authorized = deniedCapabilities.length === 0;

    this.recordAudit(agentId, 'policy_enforced', authorized ? 'success' : 'failure', `Privilege check: denied ${deniedCapabilities.join(', ') || 'none'}`);

    return { authorized, deniedCapabilities };
  }

  /**
   * Check for execution escape attempts
   */
  detectEscapeAttempts(code: string, location: string): boolean {
    const escapePatterns = [
      /process\.exit/,
      /process\.abort/,
      /process\.uncaughtException/,
      /vm\.runInThisContext/,
      /require\.cache/,
      /Object\.defineProperty.*process/,
      /setInterval.*exit/,
      /setTimeout.*exit/
    ];

    for (const pattern of escapePatterns) {
      if (pattern.test(code)) {
        const violation: SecurityViolation = {
          id: `violation-escape-${Date.now()}`,
          timestamp: new Date().toISOString(),
          severity: 'critical',
          type: 'execution_escape',
          description: 'Detected execution escape attempt',
          location,
          recommendation: 'Block this code immediately. Potential sandbox bypass.'
        };
        this.violations.push(violation);
        return true;
      }
    }

    return false;
  }

  /**
   * Record audit entry
   */
  private recordAudit(
    agentId: string,
    action: SecurityAuditEntry['action'],
    status: 'success' | 'failure',
    details: string
  ): void {
    const entry: SecurityAuditEntry = {
      timestamp: new Date().toISOString(),
      agentId,
      action,
      status,
      details
    };

    this.auditLog.push(entry);

    try {
      fs.appendFileSync(this.auditLogPath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (err) {
      console.warn(`[SANDBOX] Failed to persist audit entry: ${err}`);
    }

    // Keep in-memory log manageable
    if (this.auditLog.length > 10000) {
      this.auditLog.shift();
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport(hoursBack: number = 24): SandboxSecurityReport {
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
    const recentViolations = this.violations.filter(v => new Date(v.timestamp).getTime() > cutoff);
    const recentAudit = this.auditLog.filter(a => new Date(a.timestamp).getTime() > cutoff);

    const criticalCount = recentViolations.filter(v => v.severity === 'critical').length;
    const highCount = recentViolations.filter(v => v.severity === 'high').length;
    const mediumCount = recentViolations.filter(v => v.severity === 'medium').length;
    const lowCount = recentViolations.filter(v => v.severity === 'low').length;

    // Compliance score: 100 - (critical*20 + high*10 + medium*5 + low*1)
    let complianceScore = 100 - (criticalCount * 20 + highCount * 10 + mediumCount * 5 + lowCount);
    complianceScore = Math.max(0, Math.min(100, complianceScore));

    let riskLevel: SandboxSecurityReport['riskLevel'] = 'safe';
    if (complianceScore < 20) riskLevel = 'critical';
    else if (complianceScore < 40) riskLevel = 'high';
    else if (complianceScore < 60) riskLevel = 'medium';
    else if (complianceScore < 80) riskLevel = 'low';

    const recommendations: string[] = [];
    if (criticalCount > 0) {
      recommendations.push(`⚠️ CRITICAL: ${criticalCount} critical violations detected. Immediate action required.`);
    }
    if (highCount > 0) {
      recommendations.push(`⚠️ HIGH: ${highCount} high-severity issues. Review and remediate soon.`);
    }
    if (recentAudit.filter(a => a.status === 'failure').length > 5) {
      recommendations.push('📊 Multiple security check failures. Review agent behavior.');
    }
    if (complianceScore < 80) {
      recommendations.push('🔒 Enable stricter sandbox constraints.');
    }

    return {
      timestamp: new Date().toISOString(),
      totalViolations: recentViolations.length,
      criticalViolations: criticalCount,
      complianceScore,
      riskLevel,
      recommendations
    };
  }

  /**
   * Get audit trail for an agent
   */
  getAgentAuditTrail(agentId: string, limit: number = 50): SecurityAuditEntry[] {
    return this.auditLog
      .filter(a => a.agentId === agentId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get all violations
   */
  getViolations(hoursBack: number = 24): SecurityViolation[] {
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
    return this.violations.filter(v => new Date(v.timestamp).getTime() > cutoff);
  }

  /**
   * Clear history (for testing)
   */
  clearHistory(): void {
    this.violations = [];
    this.auditLog = [];
    try {
      if (fs.existsSync(this.auditLogPath)) {
        fs.unlinkSync(this.auditLogPath);
      }
    } catch (err) {
      // Ignore
    }
  }
}

// Singleton instance
export const sandboxValidator = new SandboxValidator();
