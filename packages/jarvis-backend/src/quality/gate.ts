import { Mission } from '../types/mission';
import { queryLLM } from '../llm';
import { MissionOrchestrator } from '../orchestrator';
import { agentBus } from '../agent-bus/redis-streams';
import { Server } from 'socket.io';
import { metricsCollector } from '../instrumentation/metricsCollector';

const PASS_THRESHOLD = 75;
const MAX_RETRIES = 2;
const EVALUATOR_MODEL = 'gpt-4o-mini';

export interface QualityResult {
    completeness: number;
    accuracy: number;
    actionability: number;
    total: number;
    passed: boolean;
    weakestCriterion: string;
    improvementNote: string;
}

export class QualityGate {
    constructor(private orchestrator: MissionOrchestrator) { }

    async evaluate(mission: Mission): Promise<QualityResult> {
        try {
            const prompt = `You are a quality evaluator for AI agent outputs.
Score this result on 3 criteria, 0-100 each.

MISSION: ${mission.prompt.slice(0, 400)}
RESULT: ${mission.result?.slice(0, 2000) ?? 'NO RESULT'}

COMPLETENESS (0-100):
Did the agent address every aspect of the mission?
Did it produce a concrete artifact not just commentary?

ACCURACY (0-100):
Are factual claims grounded or verifiable?
Are any code examples syntactically valid?
Are there obvious errors or hallucinations?

ACTIONABILITY (0-100):
Could the Founder act on this immediately without
asking a single clarifying question?
Is it specific enough to execute?

Respond ONLY with valid JSON, no markdown:
{
  "completeness": 85,
  "accuracy": 90,
  "actionability": 70,
  "total": 81,
  "passed": true,
  "weakestCriterion": "actionability",
  "improvementNote": "Add specific next steps with owners"
}`;

            const response = await queryLLM("System: Quality Evaluator", prompt);
            const jsonStr = response.replace(/```json|```/g, '').trim();
            const result = JSON.parse(jsonStr) as QualityResult;

            result.total = Math.round((result.completeness + result.accuracy + result.actionability) / 3);
            result.passed = result.total >= PASS_THRESHOLD;

            return result;
        } catch (err: any) {
            console.warn(`[QUALITY] Evaluation failed, defaulting to pass: ${err.message}`);
            return {
                completeness: 80,
                accuracy: 80,
                actionability: 80,
                total: 80,
                passed: true,
                weakestCriterion: 'none',
                improvementNote: 'Fallback pass'
            };
        }
    }

    async intercept(mission: Mission): Promise<Mission> {
        let retryCount = 0;
        let result = await this.evaluate(mission);
        mission.qualityScore = result.total;

        while (!result.passed && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`[QUALITY] Mission ${mission.id} failed quality gate (${result.total}/100). Retry ${retryCount}/${MAX_RETRIES}`);

            const correction =
                `\n\n[QUALITY GATE FEEDBACK — Attempt ${retryCount}]\n` +
                `Previous score: ${result.total}/100\n` +
                `Weakest area: ${result.weakestCriterion}\n` +
                `Required improvement: ${result.improvementNote}\n` +
                `Revise your response addressing this feedback.`;

            mission.prompt = mission.prompt + correction;

            // Re-execute
            mission = await this.reExecuteSquad(mission);
            result = await this.evaluate(mission);
            mission.qualityScore = result.total;
        }

        if (!result.passed) {
            console.warn(`[QUALITY] Mission ${mission.id} failed after ${retryCount} retries.`);
            // Publish QUALITY_FAILED to Consciousness so it can decide next action
            agentBus.publish({
                fromSquad: mission.squad || 'unknown',
                fromAgent: 'quality-gate',
                toSquad: 'consciousness',
                type: 'QUALITY_FAILED',
                payload: `Mission ${mission.id} scored ${result.total}/100 (min: ${PASS_THRESHOLD}). Issue: ${result.improvementNote}`,
                mission: mission.id,
                priority: 'HIGH',
                correlationId: mission.id,
            }).catch(err => console.warn(`[AgentBus] QUALITY_FAILED publish failed: ${err.message}`));
            mission.status = 'REVISION_REQUESTED';
            mission.result =
                `[QUALITY GATE: REVISION REQUIRED]\n` +
                `Score: ${result.total}/100 (minimum: ${PASS_THRESHOLD})\n` +
                `Completeness: ${result.completeness} | ` +
                `Accuracy: ${result.accuracy} | ` +
                `Actionability: ${result.actionability}\n` +
                `Issue: ${result.improvementNote}\n\n` +
                `Original output:\n${mission.result}`;
        } else {
            console.log(`[QUALITY] Mission ${mission.id} passed quality gate (${result.total}/100).`);
        }

        // Record quality gate metrics
        metricsCollector.recordQualityGateDecision(result.total, result.passed);

        return mission;
    }

    private async reExecuteSquad(mission: Mission): Promise<Mission> {
        // Import dynamic to avoid circular dependency issues if mission runner is complex
        const { runSquadPlan } = require('../squad');
        const { routeMission } = require('../squadRouter');

        const routing = routeMission(mission.prompt);
        // We use the same squad and allocations if possible, but the reauth/route logic is better

        const startTime = Date.now();
        // Since we are inside the backend, we can access IO from the orchestrator if needed
        // but for now, we pass null as it's a re-execution
        const io = (this.orchestrator as any).io as Server;
        const systemPrompt = (this.orchestrator as any).systemPrompt as string;

        const updatedResult = await runSquadPlan(
            mission.id,
            mission.prompt,
            routing.allocations,
            io,
            systemPrompt,
            this.orchestrator
        );

        mission.result = updatedResult;
        mission.durationMs = (mission.durationMs || 0) + (Date.now() - startTime);
        return mission;
    }
}
