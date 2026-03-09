/**
 * Operationality API — Phase 3.8 Sign-Off
 *
 * REST API for comprehensive operationality validation and sign-off:
 * - Run 25-item validation checklist
 * - Generate operationality reports
 * - Track sign-off history
 * - Final AGI readiness certification
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { operationalityValidator } from '../operationality-validator';

export async function registerOperationalityRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/operationality/validate
   * Run comprehensive operationality validation
   */
  fastify.post<{ Params: {} }>(
    '/api/operationality/validate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const report = await operationalityValidator.validate();

        return reply.send({
          success: true,
          report,
          signOffEligible: report.signOffEligible,
          gapToTarget: (95 - report.overallScore).toFixed(1)
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
   * GET /api/operationality/report
   * Get the latest operationality report
   */
  fastify.get<{ Params: {} }>(
    '/api/operationality/report',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const report = await operationalityValidator.validate();

        return reply.send({
          success: true,
          report
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
   * GET /api/operationality/checklist
   * Get detailed checklist with status
   */
  fastify.get<{ Params: {} }>(
    '/api/operationality/checklist',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const report = await operationalityValidator.validate();

        const groupedByCategory: Record<string, any[]> = {};
        for (const item of report.checklist) {
          if (!groupedByCategory[item.category]) {
            groupedByCategory[item.category] = [];
          }
          groupedByCategory[item.category].push(item);
        }

        return reply.send({
          success: true,
          checklist: report.checklist,
          grouped: groupedByCategory,
          summary: {
            total: report.checklist.length,
            passed: report.summary.passed,
            failed: report.summary.failed,
            warnings: report.summary.warnings,
            passPercentage: ((report.summary.passed / report.checklist.length) * 100).toFixed(1)
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
   * GET /api/operationality/score
   * Get just the operationality score
   */
  fastify.get<{ Params: {} }>(
    '/api/operationality/score',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const report = await operationalityValidator.validate();

        return reply.send({
          success: true,
          operationalityScore: report.overallScore.toFixed(1),
          targetScore: report.targetScore,
          status: report.status,
          signOffEligible: report.signOffEligible,
          gapToTarget: (95 - report.overallScore).toFixed(1),
          breakdownByCategory: {
            instrumentation: report.checklist.filter(c => c.category === 'Instrumentation').reduce((sum, c) => sum + c.score, 0),
            hardening: report.checklist.filter(c => c.category === 'Hardening').reduce((sum, c) => sum + c.score, 0),
            advanced: report.checklist.filter(c => c.category === 'Advanced').reduce((sum, c) => sum + c.score, 0),
            performance: report.checklist.filter(c => c.category === 'Performance').reduce((sum, c) => sum + c.score, 0),
            operations: report.checklist.filter(c => c.category === 'Operations').reduce((sum, c) => sum + c.score, 0),
            final: report.checklist.filter(c => c.category === 'Final').reduce((sum, c) => sum + c.score, 0)
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
   * GET /api/operationality/summary
   * Executive summary for sign-off decision
   */
  fastify.get<{ Params: {} }>(
    '/api/operationality/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const report = await operationalityValidator.validate();

        const failedItems = report.checklist.filter(c => c.status === 'fail').map(c => ({
          category: c.category,
          requirement: c.requirement,
          notes: c.notes
        }));

        const warningItems = report.checklist.filter(c => c.status === 'warning').map(c => ({
          category: c.category,
          requirement: c.requirement,
          notes: c.notes
        }));

        return reply.send({
          success: true,
          summary: {
            timestamp: report.timestamp,
            version: report.version,
            operationalityScore: report.overallScore.toFixed(1),
            targetScore: report.targetScore,
            readyForSignOff: report.signOffEligible,
            status: report.status,
            checklistCompletion: {
              total: report.checklist.length,
              passed: report.summary.passed,
              failed: report.summary.failed,
              warnings: report.summary.warnings
            },
            criticalIssues: failedItems,
            warningIssues: warningItems,
            blockers: report.summary.criticalGaps,
            recommendations: report.recommendations,
            signOffEligible: report.signOffEligible,
            readyForProduction: report.status === 'ready' && report.overallScore >= 95
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
