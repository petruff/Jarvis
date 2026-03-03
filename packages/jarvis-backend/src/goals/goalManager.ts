import Database from 'better-sqlite3';
import * as path from 'path';

export interface GoalHierarchy {
    horizon: string;
    quarterly: { objective: string; keyResults: string[] };
    weekly: string[];
    daily: string[];
}

export interface GoalStatus {
    tier: string;
    text: string;
    progressPct: number;
    status: 'GREEN' | 'AMBER' | 'RED';
    reason: string;
}

export class GoalManager {
    private db: Database.Database | null = null;

    constructor() {
        try {
            const dbPath = path.resolve(process.cwd(), 'data', 'jarvis.db');
            this.db = new Database(dbPath);
            // Tables are assumed to be created by SemanticMemory initialization
        } catch (err: any) {
            console.error(`[GOALS] Database connection failed: ${err.message}`);
        }
    }

    private runQuery(query: string, params: any[] = []) {
        if (!this.db) return null;
        try {
            const stmt = this.db.prepare(query);
            return stmt.run(...params);
        } catch (err: any) {
            console.error(`[GOALS] Query failed: ${err.message}`);
            return null;
        }
    }

    private runSelect(query: string, params: any[] = []) {
        if (!this.db) return [];
        try {
            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        } catch (err: any) {
            console.error(`[GOALS] Query failed: ${err.message}`);
            return [];
        }
    }

    async setHorizonGoal(goal: string): Promise<void> {
        this.runQuery(
            `INSERT INTO goals (id, text, tier, updatedAt) VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET text=excluded.text, updatedAt=excluded.updatedAt`,
            ['horizon', goal, 'horizon', new Date().toISOString()]
        );
    }

    async setQuarterlyOKR(objective: string, keyResults: string[]): Promise<void> {
        this.runQuery(
            `INSERT INTO goals (id, objective, keyResults, tier, updatedAt) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET objective=excluded.objective, keyResults=excluded.keyResults, updatedAt=excluded.updatedAt`,
            ['quarterly', objective, JSON.stringify(keyResults), 'quarterly', new Date().toISOString()]
        );
    }

    async setWeeklySprint(goals: string[]): Promise<void> {
        this.runQuery(
            `INSERT INTO goals (id, goals_list, tier, updatedAt) VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET goals_list=excluded.goals_list, updatedAt=excluded.updatedAt`,
            ['weekly', JSON.stringify(goals), 'weekly', new Date().toISOString()]
        );
    }

    async setDailyTargets(targets: string[]): Promise<void> {
        this.runQuery(
            `INSERT INTO goals (id, targets, tier, updatedAt) VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET targets=excluded.targets, updatedAt=excluded.updatedAt`,
            ['daily', JSON.stringify(targets), 'daily', new Date().toISOString()]
        );
    }

    async getActiveGoals(): Promise<GoalHierarchy> {
        const hierarchy: GoalHierarchy = {
            horizon: '',
            quarterly: { objective: '', keyResults: [] },
            weekly: [],
            daily: []
        };

        const rows = this.runSelect('SELECT * FROM goals');

        for (const row of rows as any[]) {
            const tier = row.tier;
            if (tier === 'horizon') hierarchy.horizon = row.text || row.id;
            if (tier === 'quarterly') hierarchy.quarterly = { objective: row.objective, keyResults: row.keyResults ? JSON.parse(row.keyResults) : [] };
            if (tier === 'weekly') hierarchy.weekly = row.goals_list ? JSON.parse(row.goals_list) : [];
            if (tier === 'daily') hierarchy.daily = row.targets ? JSON.parse(row.targets) : [];
        }

        return hierarchy;
    }

    async getGoalStatus(): Promise<GoalStatus[]> {
        const rows = this.runSelect('SELECT * FROM goals WHERE progressPct IS NOT NULL');

        return (rows as any[]).map(row => {
            const progress = row.progressPct || 0;
            const status = progress >= 70 ? 'GREEN' : progress >= 40 ? 'AMBER' : 'RED';

            let text = row.text || row.objective || '';
            if (!text && row.goals_list) {
                try { text = JSON.parse(row.goals_list).join(', '); } catch (e) { }
            }

            return {
                tier: row.tier,
                text,
                progressPct: progress,
                status,
                reason: row.reason || ''
            };
        });
    }

    async updateGoalProgress(tier: string, progressPct: number, reason: string): Promise<void> {
        this.runQuery(
            `UPDATE goals SET progressPct = ?, reason = ?, updatedAt = ? WHERE tier = ?`,
            [progressPct, reason, new Date().toISOString(), tier]
        );
    }
}
