# 🚀 PHASE 4 IMPLEMENTATION BRIEF — FOR @dev (DEX)
**Status:** ✅ READY FOR IMMEDIATE IMPLEMENTATION
**Date:** March 2, 2026
**Assigned to:** @dev (Dex)
**Priority:** CRITICAL (Blocking production deployment)

---

## EXECUTIVE SUMMARY

**You have 3 stories ready to implement immediately.**

Phase 4 optimization is the critical path to production. Phase 4A (baseline validation) is currently executing. Once it completes (~2 hours), these 3 stories will unlock:
- ✅ **20-30% cost reduction** (daily LLM bills)
- ✅ **15-20% faster execution** (inference time)
- ✅ **Smarter agents** (self-improving via skill discovery)

**Timeline:** 3-5 days parallel development (Days 1-7 of Phase B)
**Effort:** ~60-80 engineering hours total
**Test Coverage Required:** 90%+ (67+ new unit/integration tests)

---

## THE 3 STORIES — READY NOW

### 📍 Story 4.2: Skill Auto-Discovery
**File:** `docs/stories/epics/epic-4-agent-performance/story-4.2.md`

**What it does:**
- Agents learn new capabilities from successful execution patterns
- Automatically extract reusable skills and register them
- Share skills across squad members

**Key deliverables:**
- `PatternAnalyzer` class (detect 3+ step sequences)
- `SkillExtractor` class (abstract patterns → reusable skills)
- `SkillRegistry` class (versioning + deprecation)
- API endpoints: `/api/skills/*` (list, get, deprecate)
- React dashboard showing discovered skills
- 15+ tests (unit + integration)

**Success metric:** 1+ new skill per 100 executions, 85%+ accuracy
**Time estimate:** 3-4 days
**Complexity:** Medium (5/10)

---

### 📍 Story 4.3: Context Window Optimization
**File:** `docs/stories/epics/epic-4-agent-performance/story-4.3.md`

**What it does:**
- Reduce token usage by 20-30% while maintaining quality
- Score relevance of each context item
- Compress verbose info without losing meaning
- Implement sliding window for automatic memory management

**Key deliverables:**
- `RelevanceScorer` class (TF-IDF + recency + task alignment)
- `ContextCompressor` class (lossless summarization)
- `SlidingWindowManager` class (FIFO eviction + pinning)
- API endpoints: `/api/context/*` (analyze, optimize, metrics)
- Dashboard showing optimization impact
- 15+ tests (unit + integration)

**Success metrics:** 20-30% token reduction, 95%+ task completion, 20-30% cost savings
**Time estimate:** 3-4 days
**Complexity:** Medium (5/10)

---

### 📍 Story 4.4: Tool Chaining Intelligence
**File:** `docs/stories/epics/epic-4-agent-performance/story-4.4.md`

**What it does:**
- Analyze tool dependencies and find optimal execution order
- Reduce tool invocations by 30%
- Pre-compute and cache intermediate results
- Speed up multi-tool chains by 25-35%

**Key deliverables:**
- `DependencyAnalyzer` class (build dependency graphs)
- `ChainOptimizer` class (topological sort + optimization)
- `ResultPrecomputer` class (caching strategy)
- API endpoints: `/api/tools/dependencies`, `/api/chains/*`
- Tool Dependency Visualizer (graph view in dashboard)
- 15+ tests (unit + integration)

**Success metrics:** 30%+ step reduction, 25-35% time improvement, 60%+ cache hit rate
**Time estimate:** 3-4 days
**Complexity:** Medium (5/10)

---

## IMPLEMENTATION ROADMAP

### Wave 1: Core Classes & Unit Tests (Days 1-2)
```
4.2: PatternAnalyzer + SkillExtractor + tests
4.3: RelevanceScorer + ContextCompressor + tests
4.4: DependencyAnalyzer + ChainOptimizer + tests
```

### Wave 2: Integration & Database (Day 3)
```
4.2: SkillRegistry + DB schema migration + integration tests
4.3: SlidingWindowManager + DB schema + integration tests
4.4: ResultPrecomputer + DB schema + integration tests
```

### Wave 3: API Endpoints & Dashboard (Days 4-5)
```
4.2: `/api/skills/*` endpoints + SkillsDiscovery React component
4.3: `/api/context/*` endpoints + optimization dashboard panel
4.4: `/api/tools/*` endpoints + dependency visualizer
```

### Wave 4: E2E Tests & Deployment (Days 5-7)
```
All: E2E tests, performance benchmarks, documentation
Deploy: Staging validation, Phase 4C final metrics
```

---

## FILES TO CREATE

### Backend (Story 4.2 - Skills)
```
packages/jarvis-backend/src/
├── skills/
│   ├── patternAnalyzer.ts       (NEW - 200+ lines)
│   ├── skillExtractor.ts        (NEW - 200+ lines)
│   ├── skillRegistry.ts         (NEW - 150+ lines)
│   └── skillManager.ts          (NEW - 100+ lines)
├── api/
│   └── skills.ts                (NEW - 150+ lines, 7 endpoints)
└── schemas/
    └── skills.sql              (NEW - DB schema)

tests/
├── units/
│   ├── patternAnalyzer.test.ts  (NEW - 5+ tests)
│   └── skillExtractor.test.ts   (NEW - 5+ tests)
└── integration/
    └── skillRegistry.test.ts    (NEW - 5+ tests)

jarvis-ui/src/
├── components/
│   └── SkillsDiscovery.tsx      (NEW - React component)
└── hooks/
    └── useSkillsDiscovery.ts    (NEW - React hook)
```

### Backend (Story 4.3 - Context)
```
packages/jarvis-backend/src/
├── context/
│   ├── relevanceScorer.ts       (NEW - 200+ lines)
│   ├── contextCompressor.ts     (NEW - 150+ lines)
│   ├── slidingWindowManager.ts  (NEW - 150+ lines)
│   └── contextAnalyzer.ts       (NEW - 100+ lines)
├── api/
│   └── context.ts               (NEW - 150+ lines, 5 endpoints)
└── schemas/
    └── context.sql              (NEW - DB schema)

tests/
├── units/
│   ├── relevanceScorer.test.ts  (NEW - 5+ tests)
│   └── contextCompressor.test.ts(NEW - 5+ tests)
└── integration/
    └── contextOptimization.test.ts (NEW - 5+ tests)

jarvis-ui/src/
└── components/
    └── ContextOptimization.tsx  (NEW - React component)
```

### Backend (Story 4.4 - Tools)
```
packages/jarvis-backend/src/
├── tools/
│   ├── dependencyAnalyzer.ts    (NEW - 200+ lines)
│   ├── chainOptimizer.ts        (NEW - 200+ lines)
│   ├── resultPrecomputer.ts     (NEW - 150+ lines)
│   └── chainAnalyzer.ts         (NEW - 100+ lines)
├── api/
│   └── chains.ts                (NEW - 150+ lines, 5 endpoints)
└── schemas/
    └── chains.sql               (NEW - DB schema)

tests/
├── units/
│   ├── dependencyAnalyzer.test.ts (NEW - 5+ tests)
│   └── chainOptimizer.test.ts   (NEW - 5+ tests)
└── integration/
    └── chainOptimization.test.ts (NEW - 5+ tests)

jarvis-ui/src/
├── components/
│   └── ToolChainVisualizer.tsx  (NEW - React component)
└── hooks/
    └── useToolChains.ts         (NEW - React hook)
```

---

## TESTING REQUIREMENTS

**Total tests needed:** 67+
- **Unit tests:** 45+ (15 per story)
- **Integration tests:** 15+ (5 per story)
- **E2E tests:** 7+ (via dashboard + API calls)

**Coverage target:** 90%+ minimum

**Test files to create:**
```
tests/units/
├── patternAnalyzer.test.ts
├── skillExtractor.test.ts
├── relevanceScorer.test.ts
├── contextCompressor.test.ts
├── dependencyAnalyzer.test.ts
└── chainOptimizer.test.ts

tests/integration/
├── skillRegistry.test.ts
├── contextOptimization.test.ts
└── chainOptimization.test.ts
```

---

## DEPENDENCIES & BLOCKERS

### ✅ No blocking dependencies
All required infrastructure already exists:
- Agent execution logs available
- Task queue operational
- Database connection ready
- LLM providers configured
- Memory systems running

### ⚠️ Pre-existing TypeScript errors (safe to ignore)
These don't block functionality and exist in other files:
- `redis-streams.ts:161` — BLOCK param type
- `nightlyLearning.ts` — argument count mismatches

---

## DATABASE MIGRATIONS

Each story needs SQL schema:

**Story 4.2 - Skills Table:**
```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  description TEXT,
  pattern_source UUID,
  parameters JSONB,
  success_rate DECIMAL(5,2),
  usage_count INTEGER,
  version INTEGER,
  status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE skill_executions (
  id UUID PRIMARY KEY,
  skill_id UUID REFERENCES skills(id),
  agent_id UUID,
  result VARCHAR(50),
  duration_ms INTEGER,
  created_at TIMESTAMP
);
```

**Story 4.3 - Context Table:**
```sql
CREATE TABLE context_metrics (
  id UUID PRIMARY KEY,
  agent_id UUID,
  original_tokens INTEGER,
  optimized_tokens INTEGER,
  compression_ratio DECIMAL(5,2),
  task_completion BOOLEAN,
  quality_score DECIMAL(5,2),
  cost_saved DECIMAL(10,6),
  created_at TIMESTAMP
);

CREATE TABLE relevance_cache (
  id UUID PRIMARY KEY,
  document_id UUID,
  query_hash VARCHAR(64),
  relevance_score DECIMAL(5,2),
  ttl_minutes INTEGER,
  created_at TIMESTAMP
);
```

**Story 4.4 - Tools Table:**
```sql
CREATE TABLE tool_dependencies (
  id UUID PRIMARY KEY,
  tool_id VARCHAR(100),
  depends_on VARCHAR(100),
  constraint_type VARCHAR(50),
  created_at TIMESTAMP
);

CREATE TABLE chain_optimizations (
  id UUID PRIMARY KEY,
  chain_id VARCHAR(100),
  original_steps INTEGER,
  optimized_steps INTEGER,
  step_reduction DECIMAL(5,2),
  execution_time_original BIGINT,
  execution_time_optimized BIGINT,
  time_saved_percent DECIMAL(5,2),
  cost_saved DECIMAL(10,6),
  created_at TIMESTAMP
);

CREATE TABLE tool_cache (
  id UUID PRIMARY KEY,
  tool_id VARCHAR(100),
  input_hash VARCHAR(64),
  output_data JSONB,
  hit_count INTEGER,
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

Run migrations via:
```bash
npm run db:migrate
```

---

## SUCCESS CRITERIA (Definition of Done)

### Story 4.2 ✅ Complete when:
- [ ] PatternAnalyzer detects 3+ step sequences
- [ ] SkillExtractor generates reusable skills
- [ ] SkillRegistry tracks versions + deprecations
- [ ] 7 API endpoints working (`/api/skills/*`)
- [ ] SkillsDiscovery React component displays skills
- [ ] 15+ tests passing (unit + integration)
- [ ] Performance: Skill lookup <50ms avg

### Story 4.3 ✅ Complete when:
- [ ] RelevanceScorer returns 0-1 scores
- [ ] ContextCompressor achieves 20%+ reduction
- [ ] SlidingWindowManager enforces token limits
- [ ] 5 API endpoints working (`/api/context/*`)
- [ ] Optimization dashboard shows metrics
- [ ] 15+ tests passing (unit + integration)
- [ ] Quality impact measured (95%+ task completion)

### Story 4.4 ✅ Complete when:
- [ ] DependencyAnalyzer builds graphs correctly
- [ ] ChainOptimizer achieves 30%+ step reduction
- [ ] ResultPrecomputer caches effectively
- [ ] 5 API endpoints working (`/api/chains/*`)
- [ ] Tool Dependency Visualizer displays graphs
- [ ] 15+ tests passing (unit + integration)
- [ ] Cache hit rate measured (60%+)

---

## PHASE 4C VALIDATION

After all stories complete, run Phase 4C:

```bash
# Collect baseline metrics (from Phase 4A results)
curl http://localhost:3000/api/rate-limit/status

# Compare optimization impact
curl http://localhost:3000/api/metrics/phase4c

# Verify success criteria
- Cost reduction: 20-30% ✓
- Speed improvement: 15-20% ✓
- Quality maintained: 95%+ ✓
- All tests passing: 90%+ ✓
```

---

## NEXT STEPS (For @dev Right Now)

### Immediate (Next 2 hours)
1. Read all 3 stories (links above)
2. Review database schemas
3. Set up local branches for parallel work

### Today (After Phase 4A completes)
1. Start Wave 1: PatternAnalyzer, RelevanceScorer, DependencyAnalyzer
2. Write unit tests as you go
3. Commit daily

### This Week
1. Complete Wave 2 (integration + DB)
2. Complete Wave 3 (API + dashboard)
3. Complete Wave 4 (E2E + deployment)

---

## REFERENCE MATERIALS

**Full story details:**
- Story 4.2: `docs/stories/epics/epic-4-agent-performance/story-4.2.md`
- Story 4.3: `docs/stories/epics/epic-4-agent-performance/story-4.3.md`
- Story 4.4: `docs/stories/epics/epic-4-agent-performance/story-4.4.md`

**Architecture reference:**
- `.claude/CLAUDE.md` — Project structure & conventions
- `ACTIVATION-SUMMARY.md` — Current system state
- `PATH-C-EXECUTION-PLAN.md` — Overall roadmap

**Phase 4A Status:**
- Monitor: `curl http://localhost:3000/api/rate-limit/status`
- Tasks: `packages/jarvis-backend/.jarvis/tasks/`

---

## CONTACT & QUESTIONS

- **Phase 4 PM:** @pm (Morgan) - for requirements clarification
- **QA Lead:** @qa (Quinn) - for testing strategy
- **DevOps:** @devops (Gage) - for infrastructure/deployment

**Questions about tasks?** Check the stories directly (links above) - they're comprehensive.

---

**Ready to build. Let's go.** 🚀

*Created: March 2, 2026*
*For: @dev (Dex)*
*Priority: CRITICAL*
