# Phase 7 Database Migration Guide

This guide explains how to apply Phase 7 database migrations to production.

## Migration Files

The following migration files create all Phase 7 enterprise features:

| File | System | Tables | Purpose |
|------|--------|--------|---------|
| `001_phase7_multi_tenant_isolation.sql` | Multi-Tenant | 3 | Tenant management, teams, audit logging |
| `002_phase7_advanced_rbac.sql` | RBAC | 3 | Roles, user assignments, permission audit |
| `003_phase7_backup_disaster_recovery.sql` | Backup/DR | 3 | Backup metadata, recovery plans, replication |
| `004_phase7_consensus_history.sql` | Consensus | 2 | Decision tracking, dispute management |
| `005_phase7_clone_comparison.sql` | Clone Comparison | 2 | Comparison metrics, analysis results |

**Total: 5 migration files, 13 tables, 40+ indexes, 20+ functions**

## Database Requirements

- PostgreSQL 12+
- UUID extension enabled: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- pg_trgm extension (for text search): `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

## Manual Deployment

### Option 1: Using psql (Recommended)

```bash
# Connect to your database
psql -h localhost -U postgres -d jarvis

# Execute migrations in order (MUST be in this order)
\i migrations/001_phase7_multi_tenant_isolation.sql
\i migrations/002_phase7_advanced_rbac.sql
\i migrations/003_phase7_backup_disaster_recovery.sql
\i migrations/004_phase7_consensus_history.sql
\i migrations/005_phase7_clone_comparison.sql

# Verify all tables created
\dt

# Check RLS policies enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE '%tenant%' OR tablename LIKE '%role%' OR tablename LIKE '%backup%';
```

### Option 2: Using Migration Script (TypeScript)

Create a `runMigrations.ts` file:

```typescript
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations(dbConfig: any) {
  const client = new Pool(dbConfig);

  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.startsWith('00') && f.endsWith('.sql'))
      .sort();

    console.log(`🔄 Running ${files.length} migrations...`);

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`⏳ Running ${file}...`);

      await client.query(sql);
      console.log(`✅ ${file} completed`);
    }

    console.log('✅ All migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

// Usage:
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'jarvis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};

runMigrations(config).catch(console.error);
```

### Option 3: Supabase CLI

If using Supabase:

```bash
# Apply migrations
supabase db push

# Check status
supabase migration list
```

## Initialization Steps

After migrations are applied, initialize default RBAC roles for each tenant:

```sql
-- Initialize roles for all tenants
SELECT initialize_tenant_roles(id) FROM tenants WHERE is_active = TRUE;
```

## Verification Checklist

After migrations complete, verify:

```sql
-- 1. Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%backup%'
    OR table_name LIKE '%role%'
    OR table_name LIKE '%tenant%'
    OR table_name LIKE '%consensus%'
    OR table_name LIKE '%clone_comparison%';

-- 2. Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = TRUE;

-- 3. Check indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- 4. Check views created
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE 'v_%';

-- 5. Check functions created
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%backup%'
    OR routine_name LIKE '%recovery%'
    OR routine_name LIKE '%consensus%';
```

## Integration with Backend Initialization

Once migrations are applied, the backend `initialize()` methods will:

1. Check if tables exist
2. Create any missing tables (idempotent)
3. Verify RLS policies are active
4. Log initialization status

Add this to `packages/jarvis-backend/src/index.ts`:

```typescript
import { Pool } from 'pg';

// During startup, after DB connection:
const db = new Pool(config.database);

// Phase 7: Enterprise Feature Initialization
console.log('────────────────────────────────────────────');
console.log('  PHASE 7: ENTERPRISE FEATURES INITIALIZING  ');
console.log('────────────────────────────────────────────');

// 1. Multi-Tenant Isolation
try {
  const multiTenant = new MultiTenantIsolationManager(db, cache);
  await multiTenant.initialize();
  console.log('✅ MULTI-TENANT ISOLATION: [ONLINE]');
} catch (e) {
  console.error('❌ MULTI-TENANT ISOLATION: [FAILED]', e.message);
}

// 2. Advanced RBAC
try {
  const rbac = new AdvancedRBACManager(db, cache);
  await rbac.initialize();
  console.log('✅ ADVANCED RBAC: [ONLINE]');
} catch (e) {
  console.error('❌ ADVANCED RBAC: [FAILED]', e.message);
}

// 3. Backup & Disaster Recovery
try {
  const backup = new BackupDisasterRecoveryManager(db, cache, backupConfig);
  await backup.initialize();
  console.log('✅ BACKUP & DISASTER RECOVERY: [ONLINE]');
} catch (e) {
  console.error('❌ BACKUP & DISASTER RECOVERY: [FAILED]', e.message);
}

// 4. Consensus History Tracking
try {
  const consensus = new ConsensusHistoryTracker(db, cache);
  await consensus.initialize();
  console.log('✅ CONSENSUS HISTORY TRACKING: [ONLINE]');
} catch (e) {
  console.error('❌ CONSENSUS HISTORY TRACKING: [FAILED]', e.message);
}

// 5. Clone Comparison Engine
try {
  const comparison = new CloneComparisonManager(db, cache);
  await comparison.initialize();
  console.log('✅ CLONE COMPARISON ENGINE: [ONLINE]');
} catch (e) {
  console.error('❌ CLONE COMPARISON ENGINE: [FAILED]', e.message);
}

console.log('────────────────────────────────────────────');
```

## Rollback Strategy

If issues occur, rollback migrations:

```sql
-- Rollback Phase 7 (drops all Phase 7 tables)
DROP TABLE IF EXISTS clone_comparison_metrics CASCADE;
DROP TABLE IF EXISTS clone_comparisons CASCADE;
DROP TABLE IF EXISTS consensus_disputes CASCADE;
DROP TABLE IF EXISTS consensus_history CASCADE;
DROP TABLE IF EXISTS replication_status CASCADE;
DROP TABLE IF EXISTS recovery_plans CASCADE;
DROP TABLE IF EXISTS backup_metadata CASCADE;
DROP TABLE IF EXISTS permission_audit_log CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS tenant_audit_log CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS initialize_tenant_roles(UUID) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_backups() CASCADE;
DROP FUNCTION IF EXISTS verify_backup(UUID) CASCADE;
DROP FUNCTION IF EXISTS record_consensus_decision(...) CASCADE;
DROP FUNCTION IF EXISTS reverse_consensus_decision(...) CASCADE;
DROP FUNCTION IF EXISTS dispute_consensus_decision(...) CASCADE;
DROP FUNCTION IF EXISTS record_clone_comparison(...) CASCADE;

-- Drop views
DROP VIEW IF EXISTS v_backup_summary CASCADE;
DROP VIEW IF EXISTS v_recovery_status CASCADE;
DROP VIEW IF EXISTS v_replication_health CASCADE;
DROP VIEW IF EXISTS v_consensus_timeline_metrics CASCADE;
DROP VIEW IF EXISTS v_consensus_quality_trends CASCADE;
DROP VIEW IF EXISTS v_disputed_domains CASCADE;
DROP VIEW IF EXISTS v_clone_comparison_summary CASCADE;
DROP VIEW IF EXISTS v_top_clone_matches CASCADE;
DROP VIEW IF EXISTS v_clone_strength_analysis CASCADE;
DROP VIEW IF EXISTS v_clone_weakness_analysis CASCADE;
```

## Performance Tuning

For high-volume scenarios:

```sql
-- Increase checkpoint settings
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Enable parallel query execution
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;

-- Apply settings
SELECT pg_reload_conf();
```

## Monitoring

Monitor migration health:

```sql
-- Check table sizes
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(table_schema||'.'||table_name) DESC;

-- Monitor RLS performance
SELECT
  schemaname,
  tablename,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename LIKE '%tenant%' OR tablename LIKE '%role%';
```

## Support & Debugging

If migrations fail:

1. Check PostgreSQL version: `SELECT version();`
2. Check extensions: `SELECT * FROM pg_extension;`
3. Review PostgreSQL logs: `/var/log/postgresql/`
4. Test individual migrations in isolation
5. Verify database user has adequate permissions

For assistance, refer to:
- Phase 7 Implementation: `PHASE_7_IMPLEMENTATION.md`
- API Endpoints: `api/mindclones-enterprise.ts`
- Backend Integration: See integration notes below

---

**Status:** ✅ Production-ready migrations for Phase 7: Enterprise Features
**Created:** March 2, 2026
**Version:** 1.0
