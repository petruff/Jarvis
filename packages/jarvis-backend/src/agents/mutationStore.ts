// src/agents/mutationStore.ts
// JARVIS DNA Mutation Store — Phase 3
//
// Bridges the Nightly Learning Cycle and the Agent Registry.
// Proposed mutations from nightlyLearning.ts are persisted here.
// The Founder approves them via Telegram or API → they are applied
// to agentRegistry.json and hot-reloaded at runtime.

import * as fs from 'fs';
import * as path from 'path';
import { agentRegistry } from './registry';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PendingMutation {
    id: string;
    agentId: string;
    field: 'dna' | 'mandate' | 'focus';
    currentValue: string;
    proposedChange: string;
    reason: string;
    proposedAt: string;
    cycleId: string;
    status: 'pending' | 'approved' | 'rejected';
    resolvedAt?: string;
}

export interface MutationStoreData {
    mutations: PendingMutation[];
    lastUpdated: string;
}

// ─── MutationStore Class ──────────────────────────────────────────────────────

export class MutationStore {
    private filePath: string;
    private registryPath: string;

    constructor() {
        const dataDir = path.resolve(process.cwd(), '.jarvis');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.filePath = path.join(dataDir, 'pending-mutations.json');
        this.registryPath = path.resolve(__dirname, '../../config/agentRegistry.json');
    }

    // ─── Read / Write store ─────────────────────────────────────────────────

    private read(): MutationStoreData {
        try {
            if (fs.existsSync(this.filePath)) {
                return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
            }
        } catch (err: any) {
            console.error(`[MUTATIONS] Failed to read store: ${err.message}`);
        }
        return { mutations: [], lastUpdated: new Date().toISOString() };
    }

    private write(data: MutationStoreData): void {
        try {
            data.lastUpdated = new Date().toISOString();
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err: any) {
            console.error(`[MUTATIONS] Failed to write store: ${err.message}`);
        }
    }

    // ─── Save proposed mutations from Nightly Learning ──────────────────────

    saveMutations(
        rawMutations: Array<{ agentId: string; field: string; currentValue: string; proposedChange: string; reason: string }>,
        cycleId: string
    ): PendingMutation[] {
        const data = this.read();

        const newMutations: PendingMutation[] = rawMutations.map((m, i) => ({
            id: `mut-${cycleId}-${i}`,
            agentId: m.agentId,
            field: (m.field as PendingMutation['field']) || 'dna',
            currentValue: m.currentValue || '',
            proposedChange: m.proposedChange,
            reason: m.reason,
            proposedAt: new Date().toISOString(),
            cycleId,
            status: 'pending',
        }));

        // Deduplicate: skip if a pending mutation for same agent+field already exists
        const existingKeys = new Set(
            data.mutations
                .filter(m => m.status === 'pending')
                .map(m => `${m.agentId}:${m.field}`)
        );

        const toAdd = newMutations.filter(m => !existingKeys.has(`${m.agentId}:${m.field}`));
        data.mutations.push(...toAdd);

        this.write(data);
        console.log(`[MUTATIONS] Saved ${toAdd.length} new mutations from cycle ${cycleId}`);
        return toAdd;
    }

    // ─── Get all pending mutations ───────────────────────────────────────────

    getPendingMutations(): PendingMutation[] {
        return this.read().mutations.filter(m => m.status === 'pending');
    }

    getAllMutations(): PendingMutation[] {
        return this.read().mutations;
    }

    getMutationById(id: string): PendingMutation | undefined {
        return this.read().mutations.find(m => m.id === id);
    }

    // ─── Apply an approved mutation to agentRegistry.json ───────────────────

    applyMutation(id: string): { success: boolean; message: string } {
        const data = this.read();
        const mutation = data.mutations.find(m => m.id === id);

        if (!mutation) return { success: false, message: `Mutation ${id} not found` };
        if (mutation.status !== 'pending') return { success: false, message: `Mutation ${id} is already ${mutation.status}` };

        try {
            // 1. Apply to the in-memory registry (immediate effect)
            const agent = agentRegistry.getAgent(mutation.agentId);
            if (!agent) {
                return { success: false, message: `Agent ${mutation.agentId} not found in registry` };
            }

            agentRegistry.mutateAgent(mutation.agentId, {
                [mutation.field]: mutation.proposedChange
            });

            // 2. Persist to agentRegistry.json (survives restarts)
            if (fs.existsSync(this.registryPath)) {
                const registryData = JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));

                for (const squad of registryData.squads) {
                    for (const agentEntry of squad.agents) {
                        if (agentEntry.id === mutation.agentId) {
                            agentEntry[mutation.field] = mutation.proposedChange;
                        }
                    }
                }

                fs.writeFileSync(this.registryPath, JSON.stringify(registryData, null, 2), 'utf-8');
                console.log(`[MUTATIONS] Applied: ${mutation.agentId}.${mutation.field} updated in agentRegistry.json`);
            }

            // 3. Mark as approved in store
            mutation.status = 'approved';
            mutation.resolvedAt = new Date().toISOString();
            this.write(data);

            return { success: true, message: `Mutation applied: ${mutation.agentId}.${mutation.field} updated` };

        } catch (err: any) {
            console.error(`[MUTATIONS] Apply failed: ${err.message}`);
            return { success: false, message: `Apply failed: ${err.message}` };
        }
    }

    // ─── Reject a mutation ───────────────────────────────────────────────────

    rejectMutation(id: string): { success: boolean; message: string } {
        const data = this.read();
        const mutation = data.mutations.find(m => m.id === id);

        if (!mutation) return { success: false, message: `Mutation ${id} not found` };
        if (mutation.status !== 'pending') return { success: false, message: `Mutation ${id} is already ${mutation.status}` };

        mutation.status = 'rejected';
        mutation.resolvedAt = new Date().toISOString();
        this.write(data);

        console.log(`[MUTATIONS] Rejected: ${mutation.agentId}.${mutation.field}`);
        return { success: true, message: `Mutation rejected: ${mutation.agentId}.${mutation.field}` };
    }

    // ─── Apply ALL pending mutations at once (Founder bulk approval) ─────────

    applyAllPending(): { applied: number; failed: number; errors: string[] } {
        const pending = this.getPendingMutations();
        let applied = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const mutation of pending) {
            const result = this.applyMutation(mutation.id);
            if (result.success) {
                applied++;
            } else {
                failed++;
                errors.push(result.message);
            }
        }

        console.log(`[MUTATIONS] Bulk apply: ${applied} applied, ${failed} failed`);
        return { applied, failed, errors };
    }

    // ─── Summary for morning briefing ────────────────────────────────────────

    getPendingSummary(): string {
        const pending = this.getPendingMutations();
        if (!pending.length) return 'No pending DNA mutations.';

        const lines = pending.map((m, i) =>
            `${i + 1}. **${m.agentId}** (${m.field}): ${m.proposedChange.slice(0, 120)}...\n   _Reason: ${m.reason.slice(0, 100)}_`
        );

        return `## 🧬 Pending DNA Mutations (${pending.length})\n${lines.join('\n\n')}`;
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const mutationStore = new MutationStore();
