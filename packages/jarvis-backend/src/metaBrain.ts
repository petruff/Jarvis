// src/metaBrain.ts
// JARVIS Meta-Brain — Recursive DAG Planner (Phase 9)
//
// Takes a complex high-level mission and decomposes it into a
// dependency-aware DAG of atomic tasks. Executes nodes in topological
// order (parallel where possible, sequential where required).
// Re-plans on node failure. Persists state to disk for crash recovery.

import * as fs from 'fs';
import * as path from 'path';
import { queryLLM } from './llm';
import { agentBus } from './agent-bus/redis-streams';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeStatus = 'pending' | 'blocked' | 'in_progress' | 'suspended' | 'done' | 'failed' | 'skipped';
export type NodePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DAGNode {
    id: string;              // Unique ID within DAG (e.g. "node-1")
    task: string;            // What to execute (mission prompt for squad)
    squad: string;           // Which squad executes this node
    dependencies: string[];  // IDs of nodes that must be DONE before this starts
    status: NodeStatus;
    result?: string;         // Output from squad execution
    priority: NodePriority;
    estimatedMinutes?: number;
    startedAt?: string;
    completedAt?: string;
    retryCount?: number;
    suspendReason?: string;
    suspendUntil?: string; // ISO date string
    subNodes?: DAGNode[];  // HTN: Hierarchical decomposition for complex tasks
}

export interface DAG {
    id: string;
    mission: string;         // Original high-level mission
    nodes: DAGNode[];
    status: 'planning' | 'executing' | 'done' | 'failed' | 'paused';
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    founderApprovalRequired?: boolean;
    approvedAt?: string;
    totalNodes: number;
    doneNodes: number;
    failedNodes: number;
}

export interface DAGResult {
    dagId: string;
    success: boolean;
    completedNodes: number;
    failedNodes: number;
    summary: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAG_DIR = path.resolve(process.cwd(), '.jarvis', 'dags');
const MAX_DAG_NODES = 20;        // Safety cap: never more than 20 nodes per plan
const MAX_PARALLEL_NODES = 3;    // Max nodes executing simultaneously
const NODE_RETRY_LIMIT = 1;      // Retry a failed node once before marking failed

// ─── MetaBrain Class ──────────────────────────────────────────────────────────

export class MetaBrain {
    private activeDags: Map<string, DAG> = new Map();

    constructor() {
        this.ensureDir();
        this.loadPersistedDags();
    }

    private ensureDir(): void {
        if (!fs.existsSync(DAG_DIR)) {
            fs.mkdirSync(DAG_DIR, { recursive: true });
        }
    }

    private loadPersistedDags(): void {
        try {
            const files = fs.readdirSync(DAG_DIR).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const dag = JSON.parse(fs.readFileSync(path.join(DAG_DIR, file), 'utf-8')) as DAG;
                if (dag.status === 'executing' || dag.status === 'paused') {
                    this.activeDags.set(dag.id, dag);
                    console.log(`[META-BRAIN] Loaded in-progress DAG: ${dag.id} (${dag.doneNodes}/${dag.totalNodes} done)`);
                }
            }
        } catch {
            // No persisted DAGs — fresh start
        }
    }

    // ─── Plan: Decompose mission into DAG ─────────────────────────────────────

    async plan(mission: string, requireApproval = false): Promise<DAG> {
        console.log(`[META-BRAIN] Planning: "${mission.slice(0, 80)}..."`);

        const planPrompt = `You are JARVIS Meta-Brain — a strategic decomposition engine.

Mission: ${mission}

Decompose this mission into 3-${Math.min(MAX_DAG_NODES, 12)} atomic tasks that can be delegated to specialized squads.
Each task must be:
1. Concrete and actionable (1-2 sentences max)
2. Assigned to the right squad (oracle/mercury/forge/atlas/vault/board/produto/revenue/nexus/sentinel)
3. Ordered by dependencies (a task can only depend on tasks with lower index numbers)

Squad capabilities:
- oracle: Research, competitive analysis, deep intelligence gathering
- mercury: Copywriting, marketing, content strategy, growth campaigns
- forge: Code implementation, technical architecture, engineering
- atlas: Strategy, OKRs, operational planning, execution roadmaps
- vault: Financial modeling, risk assessment, legal review
- board: Strategic advisory, big-picture decisions, fundraising
- produto: Product design, UX, wireframes, user research
- revenue: Sales strategy, customer success, churn prevention
- nexus: AI/ML systems, automation, technology innovation
- sentinel: Security audit, compliance review, privacy protection

Return ONLY valid JSON, no markdown:
{
  "nodes": [
    {
      "id": "node-1",
      "task": "Research the competitive landscape for X, identifying top 5 competitors with pricing and positioning",
      "squad": "oracle",
      "dependencies": [],
      "priority": "HIGH",
      "estimatedMinutes": 15
    },
    {
      "id": "node-2",
      "task": "Develop positioning strategy and messaging framework based on competitive research",
      "squad": "mercury",
      "dependencies": ["node-1"],
      "priority": "HIGH",
      "estimatedMinutes": 20
    }
  ]
}`;

        let nodes: Omit<DAGNode, 'status' | 'result' | 'retryCount'>[] = [];

        try {
            const response = await queryLLM('MetaBrain Planner', planPrompt, 'forge');
            const jsonStr = response.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            nodes = (parsed.nodes || []).slice(0, MAX_DAG_NODES);
        } catch (err: any) {
            console.error(`[META-BRAIN] Plan decomposition failed: ${err.message}. Using single-node fallback.`);
            // Fallback: single-node DAG that runs the mission as-is
            nodes = [{
                id: 'node-1',
                task: mission,
                squad: 'oracle',
                dependencies: [],
                priority: 'HIGH',
                estimatedMinutes: 30,
            }];
        }

        // Validate: no circular dependencies
        nodes = this.validateAndFixDependencies(nodes as any);

        const dagId = `dag-${Date.now()}`;
        const now = new Date().toISOString();

        const dag: DAG = {
            id: dagId,
            mission,
            nodes: nodes.map(n => ({
                ...n,
                status: 'pending' as NodeStatus,
                retryCount: 0,
            })),
            status: requireApproval ? 'paused' : 'planning',
            createdAt: now,
            updatedAt: now,
            founderApprovalRequired: requireApproval,
            totalNodes: nodes.length,
            doneNodes: 0,
            failedNodes: 0,
        };

        this.activeDags.set(dagId, dag);
        this.checkpoint(dag);

        console.log(`[META-BRAIN] Plan created: ${dagId} with ${nodes.length} nodes`);
        return dag;
    }

    // ─── Execute: Run DAG in topological order ────────────────────────────────

    async execute(dagId: string, orchestratorFn: (prompt: string, squadId: string, missionId: string) => Promise<string>): Promise<DAGResult> {
        const dag = this.activeDags.get(dagId);
        if (!dag) throw new Error(`DAG ${dagId} not found`);
        if (dag.founderApprovalRequired && !dag.approvedAt) {
            throw new Error(`DAG ${dagId} requires Founder approval before execution`);
        }

        dag.status = 'executing';
        dag.updatedAt = new Date().toISOString();
        this.checkpoint(dag);

        console.log(`[META-BRAIN] Executing DAG: ${dagId} (${dag.totalNodes} nodes)`);

        let iteration = 0;
        const MAX_ITERATIONS = dag.totalNodes * 3; // Safety: prevent infinite loops

        while (iteration++ < MAX_ITERATIONS) {
            // Wake up suspended tasks if their wait time is over
            const suspendedNodes = dag.nodes.filter(n => n.status === 'suspended');
            for (const node of suspendedNodes) {
                if (node.suspendUntil && new Date() > new Date(node.suspendUntil)) {
                    node.status = 'pending';
                    console.log(`[META-BRAIN] Node ${node.id} awakened from suspension.`);
                    this.checkpoint(dag);
                }
            }

            // Find all nodes that are ready (pending + all dependencies done)
            const readyNodes = dag.nodes.filter(n =>
                n.status === 'pending' &&
                n.dependencies.every(depId => {
                    const dep = dag.nodes.find(d => d.id === depId);
                    return dep?.status === 'done' || dep?.status === 'skipped';
                })
            );

            if (readyNodes.length === 0) {
                // Check if we're done or stuck
                const pendingOrBlocked = dag.nodes.filter(n => n.status === 'pending' || n.status === 'blocked' || n.status === 'in_progress' || n.status === 'suspended');
                if (pendingOrBlocked.length === 0) break; // All nodes terminal

                // If there are suspended tasks, we must yield and not mark it as terminal
                if (dag.nodes.some(n => n.status === 'suspended' || n.status === 'in_progress')) {
                    // There is active or suspended work, just break the loop for now. It will resume later.
                    return {
                        dagId,
                        success: true,
                        completedNodes: dag.doneNodes,
                        failedNodes: dag.failedNodes,
                        summary: `DAG is paused. Waiting for tasks to complete or awaken from suspension.`,
                    };
                }

                // Stuck: all remaining nodes have failed dependencies
                const stuckNodes = dag.nodes.filter(n => n.status === 'pending');
                for (const node of stuckNodes) {
                    const hasFailedDep = node.dependencies.some(depId => {
                        const dep = dag.nodes.find(d => d.id === depId);
                        return dep?.status === 'failed';
                    });
                    if (hasFailedDep) node.status = 'skipped';
                }
                break;
            }

            // Execute up to MAX_PARALLEL_NODES simultaneously
            const batch = readyNodes.slice(0, MAX_PARALLEL_NODES);
            batch.forEach(n => { n.status = 'in_progress'; n.startedAt = new Date().toISOString(); });
            this.checkpoint(dag);

            // Run batch in parallel
            await Promise.all(batch.map(async (node) => {
                try {
                    console.log(`[META-BRAIN] Executing node ${node.id}: "${node.task.slice(0, 60)}..." → ${node.squad}`);

                    // Enrich prompt with results from dependency nodes
                    const depContext = node.dependencies
                        .map(depId => dag.nodes.find(d => d.id === depId))
                        .filter(Boolean)
                        .map(dep => `[${dep!.squad.toUpperCase()} OUTPUT — ${dep!.id}]\n${(dep!.result || '').slice(0, 800)}`)
                        .join('\n\n');

                    // HTN Context Injection
                    const originalTask = node.task;
                    const enrichedTask = depContext
                        ? `${originalTask}\n\n[CONTEXT FROM PREVIOUS STEPS]\n${depContext}\n\n[HTN CAPABILITY]: If this task requires waiting for an external event (e.g. Google indexing, manual user payment), output EXACTLY: <SUSPEND reason="Waiting for X" seconds="1000"> at the very end of your response.`
                        : `${originalTask}\n\n[HTN CAPABILITY]: If this task requires waiting for an external event (e.g. Google indexing, user input), output EXACTLY: <SUSPEND reason="Waiting for X" seconds="1000"> at the very end of your response.`;

                    node.result = await orchestratorFn(enrichedTask, node.squad, `${dagId}/${node.id}`);

                    // Parse suspension
                    const suspendMatch = node.result.match(/<SUSPEND reason="([^"]+)" seconds="(\d+)">/i);
                    if (suspendMatch) {
                        node.status = 'suspended';
                        node.suspendReason = suspendMatch[1];
                        const waitSeconds = parseInt(suspendMatch[2], 10);
                        node.suspendUntil = new Date(Date.now() + waitSeconds * 1000).toISOString();
                        console.log(`[META-BRAIN] Node ${node.id} suspended for ${waitSeconds}s: ${node.suspendReason}`);
                    } else {
                        node.status = 'done';
                        node.completedAt = new Date().toISOString();
                        dag.doneNodes++;
                    }

                    // Publish DAG node completion to bus
                    agentBus.publish({
                        fromSquad: node.squad,
                        fromAgent: 'meta-brain',
                        toSquad: 'consciousness',
                        type: 'DAG_NODE_COMPLETE',
                        payload: `DAG ${dagId} node ${node.id} completed by ${node.squad}: ${(node.result || '').slice(0, 200)}`,
                        mission: dagId,
                        priority: node.priority,
                        correlationId: dagId,
                    }).catch(() => { });

                } catch (err: any) {
                    const retries = node.retryCount || 0;
                    if (retries < NODE_RETRY_LIMIT) {
                        // Retry once
                        node.retryCount = retries + 1;
                        node.status = 'pending';
                        console.warn(`[META-BRAIN] Node ${node.id} failed, retrying (${node.retryCount}/${NODE_RETRY_LIMIT}): ${err.message}`);
                    } else {
                        node.status = 'failed';
                        node.result = `Error: ${err.message}`;
                        dag.failedNodes++;
                        console.error(`[META-BRAIN] Node ${node.id} permanently failed: ${err.message}`);

                        agentBus.publish({
                            fromSquad: node.squad,
                            fromAgent: 'meta-brain',
                            toSquad: 'consciousness',
                            type: 'DAG_NODE_FAILED',
                            payload: `DAG ${dagId} node ${node.id} failed: ${err.message}`,
                            mission: dagId,
                            priority: 'HIGH',
                            correlationId: dagId,
                        }).catch(() => { });
                    }
                }

                dag.updatedAt = new Date().toISOString();
                this.checkpoint(dag);
            }));
        }

        // Finalize
        const allDone = dag.nodes.every(n => n.status === 'done' || n.status === 'skipped');
        dag.status = allDone ? 'done' : (dag.failedNodes > 0 ? 'failed' : 'done');
        dag.completedAt = new Date().toISOString();
        dag.updatedAt = dag.completedAt;
        this.checkpoint(dag);

        const summary = this.buildSummary(dag);
        console.log(`[META-BRAIN] DAG ${dagId} complete. ${dag.doneNodes}/${dag.totalNodes} done, ${dag.failedNodes} failed.`);

        return {
            dagId,
            success: dag.status === 'done',
            completedNodes: dag.doneNodes,
            failedNodes: dag.failedNodes,
            summary,
        };
    }

    // ─── Replan: Adapt DAG when a node fails ─────────────────────────────────

    async replan(dagId: string): Promise<DAG> {
        const dag = this.activeDags.get(dagId);
        if (!dag) throw new Error(`DAG ${dagId} not found`);

        const failedNodes = dag.nodes.filter(n => n.status === 'failed');
        if (failedNodes.length === 0) return dag;

        console.log(`[META-BRAIN] Replanning DAG ${dagId}: ${failedNodes.length} failed node(s)`);

        const replanPrompt = `You are JARVIS Meta-Brain. A task has failed and you must adapt the plan.

Original mission: ${dag.mission}

Failed task(s):
${failedNodes.map(n => `- [${n.id}] ${n.task}\n  Error: ${n.result}`).join('\n')}

Completed tasks so far:
${dag.nodes.filter(n => n.status === 'done').map(n => `- [${n.id}] ${n.task} → ${(n.result || '').slice(0, 150)}`).join('\n')}

Propose 1-3 REPLACEMENT nodes to substitute for the failed ones and still achieve the mission goal.
Return ONLY valid JSON:
{
  "replacements": [
    {
      "replaces": "node-3",
      "id": "node-3b",
      "task": "Alternative approach description",
      "squad": "oracle",
      "dependencies": ["node-2"],
      "priority": "HIGH"
    }
  ]
}`;

        try {
            const response = await queryLLM('MetaBrain Replanner', replanPrompt, 'forge');
            const jsonStr = response.replace(/```json|```/g, '').trim();
            const { replacements } = JSON.parse(jsonStr);

            for (const replacement of (replacements || [])) {
                // Mark the failed node as skipped
                const failedNode = dag.nodes.find(n => n.id === replacement.replaces);
                if (failedNode) {
                    failedNode.status = 'skipped';
                    dag.failedNodes = Math.max(0, dag.failedNodes - 1);
                }
                // Add replacement node
                dag.nodes.push({
                    ...replacement,
                    status: 'pending',
                    retryCount: 0,
                });
                dag.totalNodes++;
            }

            dag.status = 'executing';
            dag.updatedAt = new Date().toISOString();
            this.checkpoint(dag);
            console.log(`[META-BRAIN] Replan complete: added ${replacements?.length || 0} replacement node(s)`);
        } catch (err: any) {
            console.error(`[META-BRAIN] Replan failed: ${err.message}`);
        }

        return dag;
    }

    // ─── Approve / Reject ─────────────────────────────────────────────────────

    approve(dagId: string): DAG | null {
        const dag = this.activeDags.get(dagId);
        if (!dag) return null;
        dag.approvedAt = new Date().toISOString();
        dag.status = 'planning'; // Ready to execute
        dag.updatedAt = dag.approvedAt;
        this.checkpoint(dag);
        console.log(`[META-BRAIN] DAG ${dagId} approved by Founder`);
        return dag;
    }

    reject(dagId: string): void {
        const dag = this.activeDags.get(dagId);
        if (!dag) return;
        dag.status = 'failed';
        dag.completedAt = new Date().toISOString();
        dag.updatedAt = dag.completedAt;
        this.activeDags.delete(dagId);
        this.checkpoint(dag);
        console.log(`[META-BRAIN] DAG ${dagId} rejected by Founder`);
    }

    // ─── Query ────────────────────────────────────────────────────────────────

    getAllDags(): DAG[] {
        try {
            const files = fs.readdirSync(DAG_DIR).filter(f => f.endsWith('.json'));
            return files
                .map(f => {
                    try { return JSON.parse(fs.readFileSync(path.join(DAG_DIR, f), 'utf-8')) as DAG; }
                    catch { return null; }
                })
                .filter(Boolean) as DAG[];
        } catch { return []; }
    }

    getDag(dagId: string): DAG | null {
        return this.activeDags.get(dagId) ||
            this.getAllDags().find(d => d.id === dagId) ||
            null;
    }

    getActiveDags(): DAG[] {
        return Array.from(this.activeDags.values());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private validateAndFixDependencies(nodes: DAGNode[]): DAGNode[] {
        const nodeIds = new Set(nodes.map(n => n.id));
        return nodes.map(node => ({
            ...node,
            // Remove references to non-existent nodes
            dependencies: node.dependencies.filter(depId => nodeIds.has(depId) && depId !== node.id),
        }));
    }

    checkpoint(dag: DAG): void {
        try {
            const filePath = path.join(DAG_DIR, `${dag.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(dag, null, 2), 'utf-8');
        } catch (err: any) {
            console.warn(`[META-BRAIN] Checkpoint failed: ${err.message}`);
        }
    }

    private buildSummary(dag: DAG): string {
        const completedNodes = dag.nodes.filter(n => n.status === 'done');
        const failedNodes = dag.nodes.filter(n => n.status === 'failed');
        const skippedNodes = dag.nodes.filter(n => n.status === 'skipped');

        const nodeResults = completedNodes
            .map(n => `**[${n.squad.toUpperCase()}] ${n.task.slice(0, 60)}**\n${(n.result || '').slice(0, 300)}`)
            .join('\n\n');

        const status = dag.status === 'done' ? '✅ Complete' : '⚠️ Partial';

        return `## ${status}: ${dag.mission.slice(0, 80)}\n\n` +
            `**Progress:** ${completedNodes.length} done, ${failedNodes.length} failed, ${skippedNodes.length} skipped of ${dag.totalNodes} total\n\n` +
            nodeResults +
            (failedNodes.length > 0 ? `\n\n**Failed tasks:**\n${failedNodes.map(n => `- ${n.task}: ${n.result}`).join('\n')}` : '');
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const metaBrain = new MetaBrain();
