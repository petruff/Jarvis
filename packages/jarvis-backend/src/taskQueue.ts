// taskQueue.ts
// Filesystem-based task queue for Jarvis v5.0
// Tasks are stored as JSON files in .jarvis/tasks/

import * as fs from 'fs';
import * as path from 'path';

const TASKS_DIR = path.resolve(process.cwd(), '.jarvis', 'tasks');
const QUEUE_INDEX = path.join(TASKS_DIR, '_queue.json');

export type TaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'REVISION_REQUESTED' | 'DONE' | 'FAILED' | 'ARCHIVED';

export interface JarvisTask {
    id: string;
    title: string;
    mission: string;
    squad: string;
    squadIcon: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: TaskStatus;
    context: {
        source: 'desktop' | 'telegram' | 'whatsapp' | 'ui' | 'gateway' | 'autonomy' | 'consciousness' | string;
        squadId?: string;
        [key: string]: any;
    };
    agentIds: string[];
    allocations?: any[];
    result?: string;
    filesCreated?: string[];
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    durationMs?: number;
    metadata?: Record<string, any>;
}

// Ensure task directory exists
function ensureDir() {
    if (!fs.existsSync(TASKS_DIR)) {
        fs.mkdirSync(TASKS_DIR, { recursive: true });
        console.log(`[TaskQueue] Created tasks directory: ${TASKS_DIR}`);
    }
}

// Generate a unique task ID
function generateTaskId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 6);
    return `task-${timestamp}-${random}`;
}

// Read the queue index
function readQueueIndex(): string[] {
    try {
        if (!fs.existsSync(QUEUE_INDEX)) return [];
        return JSON.parse(fs.readFileSync(QUEUE_INDEX, 'utf-8'));
    } catch {
        return [];
    }
}

// Write the queue index
function writeQueueIndex(ids: string[]) {
    fs.writeFileSync(QUEUE_INDEX, JSON.stringify(ids, null, 2), 'utf-8');
}

// Create a new task and persist it to disk
export function createTask(
    mission: string,
    squad: string,
    squadIcon: string,
    agentIds: string[],
    priority: JarvisTask['priority'] = 'MEDIUM',
    context: JarvisTask['context'] = { source: 'ui' },
    allocations?: any[]
): JarvisTask {
    ensureDir();

    const id = generateTaskId();
    const now = new Date().toISOString();

    const task: JarvisTask = {
        id,
        title: mission.slice(0, 80),
        mission,
        squad,
        squadIcon,
        priority,
        status: 'QUEUED',
        context,
        agentIds,
        allocations,
        createdAt: now,
        updatedAt: now,
    };

    // Write task file
    const taskFile = path.join(TASKS_DIR, `${id}.json`);
    fs.writeFileSync(taskFile, JSON.stringify(task, null, 2), 'utf-8');

    // Update index
    const index = readQueueIndex();
    index.unshift(id); // newest first
    writeQueueIndex(index);

    console.log(`[TaskQueue] Created task: ${id} → Squad: ${squad} → "${task.title}"`);
    return task;
}

// Update a task's status and optional fields
export function updateTask(
    id: string,
    updates: Partial<Pick<JarvisTask, 'status' | 'result' | 'filesCreated' | 'completedAt' | 'durationMs' | 'metadata'>>
): JarvisTask | null {
    ensureDir();
    const taskFile = path.join(TASKS_DIR, `${id}.json`);

    if (!fs.existsSync(taskFile)) {
        console.error(`[TaskQueue] Task not found: ${id}`);
        return null;
    }

    try {
        const task: JarvisTask = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
        const updated: JarvisTask = {
            ...task,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        fs.writeFileSync(taskFile, JSON.stringify(updated, null, 2), 'utf-8');
        console.log(`[TaskQueue] Updated task: ${id} → ${updated.status}`);
        return updated;
    } catch (err) {
        console.error(`[TaskQueue] Error updating task ${id}:`, err);
        return null;
    }
}

// Get a single task by ID
export function getTask(id: string): JarvisTask | null {
    ensureDir();
    const taskFile = path.join(TASKS_DIR, `${id}.json`);
    if (!fs.existsSync(taskFile)) return null;

    try {
        return JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
    } catch {
        return null;
    }
}

// Get all tasks, optionally filtered by status
export function getQueue(statusFilter?: TaskStatus): JarvisTask[] {
    ensureDir();
    const index = readQueueIndex();

    const tasks: JarvisTask[] = [];
    for (const id of index) {
        const task = getTask(id);
        if (task) {
            if (!statusFilter || task.status === statusFilter) {
                tasks.push(task);
            }
        }
    }

    return tasks;
}

// Archive completed/failed tasks older than N hours
export function archiveOldTasks(olderThanHours = 24): number {
    const tasks = getQueue();
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let archived = 0;

    for (const task of tasks) {
        if (
            (task.status === 'DONE' || task.status === 'FAILED') &&
            new Date(task.updatedAt) < cutoff
        ) {
            updateTask(task.id, { status: 'ARCHIVED' });
            archived++;
        }
    }

    if (archived > 0) console.log(`[TaskQueue] Archived ${archived} old tasks`);
    return archived;
}
