export type MissionStatus = 'QUEUED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'REVISION_REQUESTED' | 'DONE' | 'FAILED' | 'ARCHIVED';

export interface SubTask {
    id: string;
    description: string;
    targetSquad: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED';
    result?: string;
    dependencies: string[]; // IDs of SubTasks that must complete before this one starts
}

export interface Mission {
    id: string;
    prompt: string;
    squad: string;
    agentIds: string[];
    status: MissionStatus;
    result?: string;
    qualityScore?: number;
    lang?: 'en' | 'pt' | 'es';
    source: 'telegram' | 'whatsapp' | 'desktop' | 'ui' | 'autonomy' | 'consciousness';
    createdAt: string;
    completedAt?: string;
    durationMs?: number;
    episodesUsed?: string[];
    goalIds?: string[];
    subTasks?: SubTask[];
}

