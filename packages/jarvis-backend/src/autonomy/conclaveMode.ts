import { MindCloneService } from '../mindclones/mindCloneService';
import { ConsensusDecision } from '../mindclones/types';
import { Server } from 'socket.io';
import logger from '../logger';

/**
 * Conclave Mode — Collaborative Intelligence Debate Engine
 * 
 * Part of the Mega Brain integration. Facilitates multi-expert deliberation
 * on high-horizon missions to ensure consensus and risk mitigation.
 */
export class ConclaveMode {
    constructor(
        private mindCloneService: MindCloneService,
        private io: Server
    ) { }

    /**
     * Executes a consensus debate between multiple experts.
     */
    async deliberate(missionId: string, query: string, cloneIds: string[]): Promise<ConsensusDecision | null> {
        logger.info(`[CONCLAVE] Initiating deliberation for mission ${missionId} with experts: ${cloneIds.join(', ')}`);

        this.io.emit('jarvis/conclave_status', {
            missionId,
            status: 'STARTING',
            message: 'Experts are deliberating in the Conclave...'
        });

        try {
            // Get distributed consensus from the mindCloneService
            // Uses the underlying consensusCoordinator and weighted logic.
            const decision = await this.mindCloneService.getDistributedConsensus(
                query,
                undefined, // domain (optional)
                Math.min(cloneIds.length, 3), // min clones
                cloneIds.length // max clones
            );

            if (!decision) {
                logger.warn(`[CONCLAVE] Deliberation failed to reach a decision for mission ${missionId}`);
                this.io.emit('jarvis/conclave_status', {
                    missionId,
                    status: 'FAILED',
                    message: 'The Conclave could not reach a stable consensus.'
                });
                return null;
            }

            logger.info(`[CONCLAVE] Decision reached for mission ${missionId} with confidence ${(decision.confidence * 100).toFixed(1)}%`);

            this.io.emit('jarvis/conclave_status', {
                missionId,
                status: 'DECIDED',
                decision: decision.decision,
                confidence: decision.confidence,
                evidence: decision.evidence,
                dissent: decision.dissent
            });

            return decision;

        } catch (error: any) {
            logger.error(`[CONCLAVE] Error during deliberation: ${error.message}`);
            this.io.emit('jarvis/conclave_status', {
                missionId,
                status: 'ERROR',
                error: error.message
            });
            return null;
        }
    }
}
