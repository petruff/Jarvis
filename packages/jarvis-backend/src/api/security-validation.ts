/**
 * Security Validation API — Phase 3.5
 *
 * REST API for sandbox and security validation:
 * - Code analysis and pattern detection
 * - Data isolation verification
 * - Privilege boundary validation
 * - Security audit reporting
 * - Compliance scoring
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sandboxValidator } from '../security/sandbox-validator';

export async function registerSecurityValidationRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/security/analyze-code
   * Analyze code for security violations
   */
  fastify.post<{ Body: { code: string; location: string; agentId: string } }>(
    '/api/security/analyze-code',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { code, location, agentId } = request.body as any;

        if (!code || !location || !agentId) {
          return reply.status(400).send({
            success: false,
            error: 'Missing required fields: code, location, agentId'
          });
        }

        const violations = sandboxValidator.analyzeCode(code, location, agentId);
        const escapeDetected = sandboxValidator.detectEscapeAttempts(code, location);

        return reply.send({
          success: true,
          violations,
          escapeAttempted: escapeDetected,
          safeToExecute: violations.length === 0 && !escapeDetected
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/security/verify-isolation
   * Verify data isolation boundaries
   */
  fastify.post<{ Body: { agentId: string; resources: string[] } }>(
    '/api/security/verify-isolation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { agentId, resources } = request.body as any;

        if (!agentId || !Array.isArray(resources)) {
          return reply.status(400).send({
            success: false,
            error: 'Missing required fields: agentId, resources (array)'
          });
        }

        const result = sandboxValidator.verifyDataIsolation(agentId, resources);

        return reply.send({
          success: true,
          isolated: result.isolated,
          violations: result.violations,
          resourcesChecked: resources.length,
          complianceStatus: result.isolated ? 'PASS' : 'FAIL'
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/security/validate-privileges
   * Validate privilege boundaries
   */
  fastify.post<{ Body: { agentId: string; capabilities: string[] } }>(
    '/api/security/validate-privileges',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { agentId, capabilities } = request.body as any;

        if (!agentId || !Array.isArray(capabilities)) {
          return reply.status(400).send({
            success: false,
            error: 'Missing required fields: agentId, capabilities (array)'
          });
        }

        const result = sandboxValidator.validatePrivilegeBoundaries(agentId, capabilities);

        return reply.send({
          success: true,
          authorized: result.authorized,
          requestedCapabilities: capabilities,
          deniedCapabilities: result.deniedCapabilities,
          complianceStatus: result.authorized ? 'PASS' : 'FAIL'
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/security/report?hours=24
   * Generate security compliance report
   */
  fastify.get<{ Querystring: { hours?: string } }>(
    '/api/security/report',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const hours = Math.min(parseInt((request.query as any).hours || '24'), 720);
        const report = sandboxValidator.generateSecurityReport(hours);

        return reply.send({
          success: true,
          report,
          metrics: {
            complianceScore: report.complianceScore.toFixed(1),
            riskLevel: report.riskLevel,
            violations: report.totalViolations,
            critical: report.criticalViolations
          }
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/security/violations?hours=24
   * Get security violations
   */
  fastify.get<{ Querystring: { hours?: string } }>(
    '/api/security/violations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const hours = Math.min(parseInt((request.query as any).hours || '24'), 720);
        const violations = sandboxValidator.getViolations(hours);

        const bySeverity = {
          critical: violations.filter(v => v.severity === 'critical'),
          high: violations.filter(v => v.severity === 'high'),
          medium: violations.filter(v => v.severity === 'medium'),
          low: violations.filter(v => v.severity === 'low')
        };

        return reply.send({
          success: true,
          summary: {
            total: violations.length,
            critical: bySeverity.critical.length,
            high: bySeverity.high.length,
            medium: bySeverity.medium.length,
            low: bySeverity.low.length
          },
          violations: {
            critical: bySeverity.critical,
            high: bySeverity.high,
            medium: bySeverity.medium,
            low: bySeverity.low
          }
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/security/audit/:agentId?limit=50
   * Get audit trail for an agent
   */
  fastify.get<{ Params: { agentId: string }; Querystring: { limit?: string } }>(
    '/api/security/audit/:agentId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = request.params as { agentId: string };
        const limit = Math.min(parseInt((request.query as any).limit || '50'), 1000);

        const auditTrail = sandboxValidator.getAgentAuditTrail(params.agentId, limit);

        const summary = {
          codeAnalyzed: auditTrail.filter(a => a.action === 'code_analyzed').length,
          executionSandboxed: auditTrail.filter(a => a.action === 'execution_sandboxed').length,
          violationsDetected: auditTrail.filter(a => a.action === 'violation_detected').length,
          policiesEnforced: auditTrail.filter(a => a.action === 'policy_enforced').length
        };

        return reply.send({
          success: true,
          agentId: params.agentId,
          summary,
          auditTrail
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );

  /**
   * GET /api/security/status
   * Overall security status summary
   */
  fastify.get<{ Params: {} }>(
    '/api/security/status',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const report24h = sandboxValidator.generateSecurityReport(24);
        const report7d = sandboxValidator.generateSecurityReport(168);
        const report30d = sandboxValidator.generateSecurityReport(720);

        return reply.send({
          success: true,
          status: {
            current: {
              complianceScore: report24h.complianceScore.toFixed(1),
              riskLevel: report24h.riskLevel,
              violations24h: report24h.totalViolations,
              critical24h: report24h.criticalViolations
            },
            trend: {
              score7d: report7d.complianceScore.toFixed(1),
              score30d: report30d.complianceScore.toFixed(1),
              trend: report7d.complianceScore > report30d.complianceScore ? 'improving' : 'degrading'
            },
            recommendations: report24h.recommendations
          }
        });
      } catch (err: any) {
        return reply.status(500).send({
          success: false,
          error: err.message
        });
      }
    }
  );
}
