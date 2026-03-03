import * as fs from 'fs';
import * as path from 'path';

interface MemoryEntry {
    timestamp: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    context?: string;
}

export class MemorySystem {
    private filePath: string;
    private entries: MemoryEntry[] = [];

    constructor() {
        this.filePath = path.join(__dirname, '../data/memory.json');
        this.ensureDataDir();
        this.load();
    }

    private ensureDataDir() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const data = fs.readFileSync(this.filePath, 'utf-8');
                this.entries = JSON.parse(data);
            } catch (error) {
                console.error('Failed to load memory:', error);
                this.entries = [];
            }
        }
    }

    private save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save memory:', error);
        }
    }

    public add(role: 'user' | 'assistant' | 'system', content: string, context?: string) {
        const entry: MemoryEntry = {
            timestamp: new Date().toISOString(),
            role,
            content,
            context
        };
        this.entries.push(entry);

        // Keep only last 1000 entries to prevent infinite growth
        if (this.entries.length > 1000) {
            this.entries = this.entries.slice(-1000);
        }

        this.save();
    }

    public getRecentContext(limit: number = 10): string {
        return this.entries
            .slice(-limit)
            .map(e => `[${e.timestamp}] ${e.role.toUpperCase()}: ${e.content}`)
            .join('\n');
    }

    public search(query: string): MemoryEntry[] {
        const lowerQuery = query.toLowerCase();
        return this.entries.filter(e =>
            e.content.toLowerCase().includes(lowerQuery) ||
            (e.context && e.context.toLowerCase().includes(lowerQuery))
        );
    }

    // --- SQUAD HISTORY ---
    public logSquadTask(squadId: string, task: string, result: string, durationMs?: number) {
        const historyPath = path.join(__dirname, '../data/squad-history.json');
        let history: any[] = [];
        if (fs.existsSync(historyPath)) {
            try { history = JSON.parse(fs.readFileSync(historyPath, 'utf-8')); } catch (e) { }
        }
        history.push({
            timestamp: new Date().toISOString(),
            squadId,
            task,
            result,
            durationMs
        });
        if (history.length > 500) history = history.slice(-500);
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
    }

    public getSquadHistory(limit: number = 50) {
        const historyPath = path.join(__dirname, '../data/squad-history.json');
        if (!fs.existsSync(historyPath)) return [];
        try {
            const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
            return history.slice(-limit).reverse(); // Newest first
        } catch (e) { return []; }
    }
}

export const memory = new MemorySystem();
