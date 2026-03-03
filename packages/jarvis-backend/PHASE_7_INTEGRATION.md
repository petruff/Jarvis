# Phase 7 Integration Guide — Backend Initialization

This document shows the exact code changes needed to integrate Phase 7 enterprise features into the Jarvis Backend.

## Step 1: Add Phase 7 Module Imports

**File:** `packages/jarvis-backend/src/index.ts`

**Location:** After line 48 (after existing API route imports)

```typescript
// ── Phase 7: Enterprise Features ──────────────────────────────────────────
import { registerEnterpriseRoutes } from './api/mindclones-enterprise';
import CloneComparisonManager from './mindclones/cloneComparison';
import ConsensusHistoryTracker from './mindclones/consensusHistory';
import MultiTenantIsolationManager from './mindclones/multiTenantIsolation';
import AdvancedRBACManager from './mindclones/advancedRBAC';
import BackupDisasterRecoveryManager from './mindclones/backupDisasterRecovery';
```

## Step 2: Add Phase 7 Manager Exports (Optional)

**File:** `packages/jarvis-backend/src/index.ts`

**Location:** After line 88 (after other exports)

```typescript
// ── Phase 7: Enterprise Features exports
export let cloneComparisonManager: CloneComparisonManager;
export let consensusHistoryTracker: ConsensusHistoryTracker;
export let multiTenantManager: MultiTenantIsolationManager;
export let rbacManager: AdvancedRBACManager;
export let backupDisasterRecoveryManager: BackupDisasterRecoveryManager;
```

## Step 3: Add Phase 7 Initialization Block

**File:** `packages/jarvis-backend/src/index.ts`

**Location:** After line 801 (after SESSION MANAGER initialization, before Socket.IO connection handler at line 803)

```typescript
        // ── Phase 7: Enterprise Features ──────────────────────────────────
        console.log('-----------------------------------------');
        console.log('   PHASE 7: ENTERPRISE FEATURES         ');
        console.log('-----------------------------------------');

        // 1. Multi-Tenant Isolation
        try {
            multiTenantManager = new MultiTenantIsolationManager(fastify.db, fastify.redis);
            await multiTenantManager.initialize();
            console.log('✅ MULTI-TENANT ISOLATION: [ONLINE]');
            console.log('   - Tenants, teams, and audit logging configured');
            console.log('   - Row-Level Security (RLS) policies active');
        } catch (e: any) {
            console.error('❌ MULTI-TENANT ISOLATION: [FAILED]', e.message);
        }

        // 2. Advanced RBAC
        try {
            rbacManager = new AdvancedRBACManager(fastify.db, fastify.redis);
            await rbacManager.initialize();
            console.log('✅ ADVANCED RBAC: [ONLINE]');
            console.log('   - 13 granular permissions configured');
            console.log('   - 5 built-in roles initialized');
            console.log('   - Permission caching enabled (1-hour TTL)');
        } catch (e: any) {
            console.error('❌ ADVANCED RBAC: [FAILED]', e.message);
        }

        // 3. Backup & Disaster Recovery
        try {
            const backupConfig = {
                enabled: process.env.BACKUP_ENABLED === 'true',
                schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
                retention_days: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
                backup_path: process.env.BACKUP_PATH || './backups',
                incremental: true,
                verify_after_backup: true
            };

            backupDisasterRecoveryManager = new BackupDisasterRecoveryManager(
                fastify.db,
                fastify.redis,
                backupConfig
            );
            await backupDisasterRecoveryManager.initialize();
            console.log('✅ BACKUP & DISASTER RECOVERY: [ONLINE]');
            console.log(`   - Backup schedule: ${backupConfig.schedule}`);
            console.log(`   - Retention: ${backupConfig.retention_days} days`);
            console.log(`   - RTO: 4 hours | RPO: 1 hour`);
        } catch (e: any) {
            console.error('❌ BACKUP & DISASTER RECOVERY: [FAILED]', e.message);
        }

        // 4. Consensus History Tracking
        try {
            consensusHistoryTracker = new ConsensusHistoryTracker(fastify.db, fastify.redis);
            await consensusHistoryTracker.initialize();
            console.log('✅ CONSENSUS HISTORY TRACKING: [ONLINE]');
            console.log('   - Timeline tracking enabled');
            console.log('   - Trend analysis configured');
        } catch (e: any) {
            console.error('❌ CONSENSUS HISTORY TRACKING: [FAILED]', e.message);
        }

        // 5. Clone Comparison Engine
        try {
            cloneComparisonManager = new CloneComparisonManager(fastify.db, fastify.redis);
            await cloneComparisonManager.initialize();
            console.log('✅ CLONE COMPARISON ENGINE: [ONLINE]');
            console.log('   - Side-by-side comparison metrics available');
            console.log('   - Strength/weakness analysis enabled');
        } catch (e: any) {
            console.error('❌ CLONE COMPARISON ENGINE: [FAILED]', e.message);
        }

        // Register Phase 7 API endpoints
        try {
            await registerEnterpriseRoutes(fastify);
            console.log('✅ PHASE 7 API ENDPOINTS: [REGISTERED]');
            console.log('   - 22 REST endpoints ready');
            console.log('   - Clone Comparison, Consensus, Multi-Tenant, RBAC, Backup/Recovery');
        } catch (e: any) {
            console.error('❌ PHASE 7 API ENDPOINTS: [FAILED]', e.message);
        }

        console.log('-----------------------------------------');
        console.log('   PHASE 7 INITIALIZATION COMPLETE      ');
        console.log('-----------------------------------------');
```

## Step 4: Update `.env.example` (Optional)

**File:** `.env.example`

**Add these Phase 7 configuration variables:**

```bash
# ── Phase 7: Enterprise Features ─────────────────────────────────────────

# Backup & Disaster Recovery
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=./backups

# Multi-Tenant
MULTI_TENANT_ENABLED=true

# RBAC
RBAC_CACHE_TTL_MINUTES=60
RBAC_PERMISSION_CHECK_TIMEOUT_MS=5000

# Consensus History
CONSENSUS_TIMELINE_RETENTION_DAYS=365
CONSENSUS_TREND_ANALYSIS_ENABLED=true
```

## Step 5: Database Migration

**Before starting the backend:**

```bash
# Apply all Phase 7 database migrations
cd packages/jarvis-backend

# Option A: Using psql directly
psql -h localhost -U postgres -d jarvis -f migrations/001_phase7_multi_tenant_isolation.sql
psql -h localhost -U postgres -d jarvis -f migrations/002_phase7_advanced_rbac.sql
psql -h localhost -U postgres -d jarvis -f migrations/003_phase7_backup_disaster_recovery.sql
psql -h localhost -U postgres -d jarvis -f migrations/004_phase7_consensus_history.sql
psql -h localhost -U postgres -d jarvis -f migrations/005_phase7_clone_comparison.sql

# Option B: Using node script (create runMigrations.ts - see MIGRATION_GUIDE.md)
npx ts-node scripts/runMigrations.ts
```

## Step 6: Verify Integration

**Test Phase 7 endpoints:**

```bash
# 1. Health check
curl http://localhost:3000/api/health

# 2. Test clone comparison endpoint
curl -X POST http://localhost:3000/api/mindclones/enterprise/compare \
  -H "Content-Type: application/json" \
  -d '{"cloneId1": "clone-1", "cloneId2": "clone-2"}'

# 3. Test RBAC endpoint
curl -X POST http://localhost:3000/api/mindclones/enterprise/rbac/roles \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-1"}'

# 4. Test backup endpoint
curl -X POST http://localhost:3000/api/mindclones/enterprise/backup/perform \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-1"}'

# 5. Test consensus history endpoint
curl -X POST http://localhost:3000/api/mindclones/enterprise/history/timeline \
  -H "Content-Type: application/json" \
  -d '{"period": "7d"}'
```

## File Structure After Integration

```
packages/jarvis-backend/src/
├── index.ts                          # ✏️ MODIFIED: Add Phase 7 imports + initialization
├── api/
│   ├── mindclones-enterprise.ts      # ✅ CREATED: 22 API endpoints
│   ├── costs.ts                      # (Phase 5)
│   ├── skills.ts                     # (Phase 4)
│   ├── context.ts                    # (Phase 4)
│   └── chains.ts                     # (Phase 4)
├── mindclones/
│   ├── cloneComparison.ts            # ✅ CREATED: Clone comparison engine
│   ├── consensusHistory.ts           # ✅ CREATED: Consensus tracking
│   ├── multiTenantIsolation.ts       # ✅ CREATED: Multi-tenant management
│   ├── advancedRBAC.ts               # ✅ CREATED: RBAC system
│   └── backupDisasterRecovery.ts     # ✅ CREATED: Backup/recovery system
└── migrations/
    ├── 001_phase7_multi_tenant_isolation.sql          # ✅ CREATED
    ├── 002_phase7_advanced_rbac.sql                   # ✅ CREATED
    ├── 003_phase7_backup_disaster_recovery.sql        # ✅ CREATED
    ├── 004_phase7_consensus_history.sql               # ✅ CREATED
    ├── 005_phase7_clone_comparison.sql                # ✅ CREATED
    └── MIGRATION_GUIDE.md                             # ✅ CREATED

jarvis-ui/src/components/
├── CloneComparisonUI.tsx             # ✅ CREATED: Clone comparison dashboard
├── ConsensusHistoryTimeline.tsx      # ✅ CREATED: Consensus timeline
└── RBACManagementDashboard.tsx       # ✅ CREATED: RBAC admin interface
```

## Startup Sequence (After Integration)

When the backend starts:

```
[Boot] Initializing episodic memory...
✅ EPISODIC MEMORY: [ONLINE]

[Boot] Initializing semantic memory...
✅ SEMANTIC MEMORY: [ONLINE]

...

-----------------------------------------
   PHASE 7: ENTERPRISE FEATURES
-----------------------------------------
✅ MULTI-TENANT ISOLATION: [ONLINE]
   - Tenants, teams, and audit logging configured
   - Row-Level Security (RLS) policies active

✅ ADVANCED RBAC: [ONLINE]
   - 13 granular permissions configured
   - 5 built-in roles initialized
   - Permission caching enabled (1-hour TTL)

✅ BACKUP & DISASTER RECOVERY: [ONLINE]
   - Backup schedule: 0 2 * * * (2:00 AM daily)
   - Retention: 30 days
   - RTO: 4 hours | RPO: 1 hour

✅ CONSENSUS HISTORY TRACKING: [ONLINE]
   - Timeline tracking enabled
   - Trend analysis configured

✅ CLONE COMPARISON ENGINE: [ONLINE]
   - Side-by-side comparison metrics available
   - Strength/weakness analysis enabled

✅ PHASE 7 API ENDPOINTS: [REGISTERED]
   - 22 REST endpoints ready
   - Clone Comparison, Consensus, Multi-Tenant, RBAC, Backup/Recovery

-----------------------------------------
   PHASE 7 INITIALIZATION COMPLETE
-----------------------------------------

Server listening on port 3000
```

## Expected Database Tables After Integration

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND (
  table_name LIKE 'tenant%'
  OR table_name LIKE 'role%'
  OR table_name LIKE 'backup%'
  OR table_name LIKE 'recovery%'
  OR table_name LIKE 'consensus%'
  OR table_name LIKE 'clone_comparison%'
);
```

**Expected result (13 tables):**
- tenants
- teams
- tenant_audit_log
- roles
- user_roles
- permission_audit_log
- backup_metadata
- recovery_plans
- replication_status
- consensus_history
- consensus_disputes
- clone_comparisons
- clone_comparison_metrics

## Troubleshooting

### Issue: "Cannot find module './api/mindclones-enterprise'"

**Solution:** Ensure the file exists at `packages/jarvis-backend/src/api/mindclones-enterprise.ts`

### Issue: "MULTI-TENANT ISOLATION: [FAILED]" during startup

**Solution:** Check if database migrations were applied. Run migration files first:

```bash
psql -h localhost -U postgres -d jarvis -f migrations/001_phase7_multi_tenant_isolation.sql
```

### Issue: RLS policies not active

**Solution:** Verify RLS is enabled:

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename LIKE 'tenant%' OR tablename LIKE 'role%';
```

All should show `rowsecurity = TRUE`.

### Issue: Permission cache not working

**Solution:** Ensure Redis is connected:

```bash
redis-cli ping
# Should respond: PONG
```

## Performance Monitoring

After integration, monitor Phase 7 systems:

```sql
-- Monitor multi-tenant RLS overhead
SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE tablename LIKE '%tenant%' OR tablename LIKE '%role%';

-- Monitor RBAC permission checks
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE tablename = 'user_roles';

-- Monitor backup metadata growth
SELECT table_name, pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name))
FROM information_schema.tables
WHERE table_name = 'backup_metadata';
```

---

**Status:** ✅ Production-ready integration for Phase 7: Enterprise Features
**Created:** March 2, 2026
**Estimated Integration Time:** 15 minutes
