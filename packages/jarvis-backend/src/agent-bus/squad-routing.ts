// src/agent-bus/squad-routing.ts
// Inter-squad message routing map for the Redis Streams Agent Bus
// Defines which squad receives which message types + trigger logic

export type MessageType =
    | 'RESEARCH_COMPLETE'
    | 'COPY_READY'
    | 'CODE_COMPLETE'
    | 'OKR_UPDATED'
    | 'RISK_ESCALATED'
    | 'SENTINEL_VETO'
    | 'PRD_APPROVED'
    | 'CHURN_SIGNAL'
    | 'AUTONOMOUS_ACTION'
    | 'QUALITY_FAILED'
    | 'DAG_NODE_COMPLETE'
    | 'DAG_NODE_FAILED';

export const BROADCAST_SQUADS = '*';

// Routing table: message type → target squad(s)
export const SQUAD_ROUTING: Record<MessageType, string | string[]> = {
    RESEARCH_COMPLETE:  'mercury',          // Oracle → Mercury: research feeds copy writing
    COPY_READY:         'forge',            // Mercury → Forge: copy feeds implementation
    CODE_COMPLETE:      'sentinel',         // Forge → Sentinel: code feeds QA/security review
    OKR_UPDATED:        BROADCAST_SQUADS,   // Atlas → All: OKR changes align all squads
    RISK_ESCALATED:     'board',            // Vault → Board: risk surfaces to strategic layer
    SENTINEL_VETO:      BROADCAST_SQUADS,   // Sentinel → All: security block halts everything
    PRD_APPROVED:       'forge',            // Produto → Forge: approved PRD triggers build
    CHURN_SIGNAL:       'mercury',          // Revenue → Mercury: churn triggers retention campaign
    AUTONOMOUS_ACTION:  BROADCAST_SQUADS,   // Consciousness → All: proactive decision broadcast
    QUALITY_FAILED:     'consciousness',    // Quality Gate → Consciousness: failure awareness
    DAG_NODE_COMPLETE:  'consciousness',    // Meta-Brain → Consciousness: DAG progress
    DAG_NODE_FAILED:    'consciousness',    // Meta-Brain → Consciousness: DAG failure awareness
};

// Derive the source squad from the originating squad ID
export function resolveTargetSquads(messageType: MessageType): string[] {
    const target = SQUAD_ROUTING[messageType];
    if (!target) return [];
    if (target === BROADCAST_SQUADS) {
        return ['oracle', 'forge', 'mercury', 'atlas', 'vault', 'board', 'produto', 'revenue', 'nexus', 'sentinel', 'consciousness'];
    }
    return Array.isArray(target) ? target : [target];
}

// Auto-trigger rules: which message types automatically start a new mission
// (vs just logging the event)
export const AUTO_TRIGGER_TYPES: Set<MessageType> = new Set([
    'RESEARCH_COMPLETE',  // Automatically start Mercury copy writing
    'COPY_READY',         // Automatically start Forge implementation
    'PRD_APPROVED',       // Automatically start Forge build
    'CHURN_SIGNAL',       // Automatically start Mercury retention campaign
]);

// Map source squad → outbound message type (what a squad produces when it finishes)
export const SQUAD_TO_MESSAGE_TYPE: Partial<Record<string, MessageType>> = {
    oracle:   'RESEARCH_COMPLETE',
    mercury:  'COPY_READY',
    forge:    'CODE_COMPLETE',
    vault:    'RISK_ESCALATED',
    // atlas, board, produto, revenue, nexus, sentinel: broadcast via AUTONOMOUS_ACTION
};

// Build the auto-trigger prompt for a given message
export function buildTriggerPrompt(messageType: MessageType, payload: string, fromSquad: string): string {
    switch (messageType) {
        case 'RESEARCH_COMPLETE':
            return `[AUTO-TRIGGERED by ${fromSquad.toUpperCase()} via Agent Bus]\n\nResearch findings:\n${payload}\n\nYour mission: Use these research findings to create compelling marketing copy, content strategy, or growth initiatives.`;

        case 'COPY_READY':
            return `[AUTO-TRIGGERED by ${fromSquad.toUpperCase()} via Agent Bus]\n\nCopy from marketing team:\n${payload}\n\nYour mission: Implement this copy into production-ready code. Build the landing page, UI components, or feature as described.`;

        case 'PRD_APPROVED':
            return `[AUTO-TRIGGERED by ${fromSquad.toUpperCase()} via Agent Bus]\n\nApproved PRD:\n${payload}\n\nYour mission: Build the product as specified in this PRD. Start with architecture, then implement.`;

        case 'CHURN_SIGNAL':
            return `[AUTO-TRIGGERED by ${fromSquad.toUpperCase()} via Agent Bus]\n\nChurn signal detected:\n${payload}\n\nYour mission: Create an urgent retention campaign to re-engage at-risk customers. Focus on high-value segments first.`;

        default:
            return `[AUTO-TRIGGERED by ${fromSquad.toUpperCase()} via Agent Bus]\n\nContext:\n${payload}`;
    }
}
