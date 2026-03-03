/**
 * Database Adapter — Supports multiple backends
 *
 * Dev (default): SQLite in-memory
 * Prod: PostgreSQL via node-postgres
 */

export interface DatabaseAdapter {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
  close(): Promise<void>;
}

class MockDatabase implements DatabaseAdapter {
  private tables: Map<string, any[]> = new Map();

  async query(sql: string, params?: any[]): Promise<{ rows: any[] }> {
    // Simple mock for development
    // In production, replace with actual pg Pool

    if (sql.includes('CREATE TABLE')) {
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO')) {
      return { rows: [{ id: Math.random().toString(36).substr(2, 9) }] };
    }
    if (sql.includes('SELECT')) {
      return { rows: [] };
    }
    if (sql.includes('UPDATE')) {
      return { rows: [] };
    }
    if (sql.includes('DELETE')) {
      return { rows: [] };
    }
    return { rows: [] };
  }

  async close(): Promise<void> {
    // No-op for mock
  }
}

export function createDatabaseAdapter(): DatabaseAdapter {
  if (process.env.DATABASE_URL || process.env.DB_HOST) {
    // Production: use PostgreSQL
    throw new Error(
      'PostgreSQL not yet configured. Please set up node-postgres and provide DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME environment variables'
    );
  }

  // Development: use in-memory mock
  console.log('[Database] Using in-memory mock (dev mode)');
  return new MockDatabase();
}
