# JARVIS Platform: 95/100 Operationality Implementation Plan

**Created by:** Architect Agent | **Status:** APPROVED FOR EXECUTION | **Timeline:** 2-4 Weeks

## Executive Summary

Current State: **85/100** (Phase 7 routes fixed, core systems operational)
Target State: **95/100** (All Tier 1 requirements locked, Tier 2 integration complete)

### 3-Phase Implementation Strategy

| Phase | Focus | Duration | Deliverable |
|-------|-------|----------|-------------|
| **Phase 1** | Instrumentation & Baseline Metrics | 1 week | Observability dashboard |
| **Phase 2** | Core Requirements Hardening | 1 week | Tier 1 SLA lock |
| **Phase 3** | Tier 2 Integration & Deployment | 1-2 weeks | Production-ready 95/100 |

---

## Phase 1: Instrumentation & Baseline Metrics (Week 1)

**Goal:** Establish observability and measure current performance

### Tasks

#### 1.1 Logging & Monitoring Infrastructure
**File:** `packages/jarvis-backend/src/instrumentation/metricsCollector.ts` (NEW)

```typescript
// Prometheus metrics:
- autonomy_ooda_cycle_duration_ms (histogram)
- consciousness_module_duration_ms (per module)
- memory_query_latency_ms (per system: episodic, semantic, hybrid, pattern)
- reAct_loop_success_rate (counter)
- squad_routing_accuracy (counter)
- redis_stream_latency_ms (histogram)
- quality_gate_pass_rate (counter)
```

**Effort:** 1 day
**Success Criteria:** Metrics available at `/metrics` endpoint for Prometheus scraping

#### 1.2 OODA Cycle Validation Tests
**File:** `packages/jarvis-backend/src/testing/autonomyTests.ts` (NEW)

```typescript
// Test suite:
- OODA cycle timing (verify runs every 30±2 min)
- Confidence threshold validation (>85: auto, 70-85: approval, <70: escalate)
- OBSERVE phase completeness (agent logs, telemetry, missions fetched)
- ORIENT phase reasoning (context set correctly)
- DECIDE phase logic (confidence calculation)
- ACT phase execution (mutation applied or approval requested)
```

**Effort:** 1.5 days
**Success Criteria:** All tests pass; baseline timing metrics collected

#### 1.3 Memory Query Latency Baseline
**File:** `packages/jarvis-backend/src/testing/memoryTests.ts` (NEW)

```typescript
// Baseline measurements:
- Episodic memory recall < 100ms (p95)
- Semantic memory query < 100ms (p95)
- Hybrid memory parallel query < 200ms (p95)
- Pattern memory lookup < 50ms (p95)
```

**Effort:** 1.5 days
**Success Criteria:** Latency baseline established; all < 200ms target confirmed

#### 1.4 Instrumentation Integration
**Modified Files:**
- `packages/jarvis-backend/src/autonomy.ts` (lines 150-250)
- `packages/jarvis-backend/src/consciousness/nightlyLearning.ts` (lines 72-150)
- `packages/jarvis-backend/src/memory/episodic.ts` (add timing wrapper)
- `packages/jarvis-backend/src/agent.ts` (lines 1-50, add metrics)
- `packages/jarvis-backend/src/index.ts` (lines 100-120, initialize metrics)

**Effort:** 2 days
**Success Criteria:** All systems emit metrics; dashboard live

### Phase 1 Acceptance Criteria
- [ ] Prometheus scraping working (`/metrics` endpoint)
- [ ] Grafana dashboard displays real-time metrics
- [ ] OODA cycle timing baseline established (±2 min)
- [ ] Memory query latencies measured (all < 200ms)
- [ ] Test suite passes 100% of baseline tests
- [ ] Production logging configured with [COMPONENT] tags

---

## Phase 2: Core Requirements Hardening (Week 2)

**Goal:** Lock in all Tier 1 MUST-HAVE requirements with measured SLAs

### Tasks

#### 2.1 OODA Cycle Timing Stabilization
**File:** `packages/jarvis-backend/src/autonomy/cycleValidator.ts` (NEW)

```typescript
export class OODAValidator {
    private lastCycleTime: number = 0;
    private targetCycleDuration = 30 * 60 * 1000; // 30 min
    private tolerance = 2 * 60 * 1000; // ±2 min

    async validateAndCorrect(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastCycleTime;

        if (elapsed > this.targetCycleDuration + this.tolerance) {
            // Cycle ran too long, force next one
            logger.warn(`[AUTONOMY] Cycle took ${elapsed}ms, exceeds tolerance`);
        }
    }
}
```

**Effort:** 1 day
**Success Criteria:** OODA cycle runs at exactly 30±2 min over 24h continuous

#### 2.2 Consciousness Cycle Hardening
**File:** `packages/jarvis-backend/src/consciousness/cycleHardening.ts` (NEW)

```typescript
// Module timeout enforcement:
MODULE_1_TIMEOUT = 10 * 60 * 1000;  // Retrospective: 10 min
MODULE_2_TIMEOUT = 10 * 60 * 1000;  // Error archaeology: 10 min
MODULE_3_TIMEOUT = 30 * 60 * 1000;  // Web harvest: 30 min
MODULE_4_TIMEOUT = 40 * 60 * 1000;  // Synthesis: 40 min
MODULE_5_TIMEOUT = 15 * 60 * 1000;  // Calibration: 15 min
TOTAL_TIMEOUT = 120 * 60 * 1000;    // Total: 2 hours hard limit

// Graceful degradation: skip module if timeout hit, continue cycle
```

**Effort:** 1.5 days
**Success Criteria:** All modules complete within timeout; max 2h total cycle

#### 2.3 ReAct Loop Success Rate Validation
**File:** Extend `packages/jarvis-backend/src/agent.ts` (lines 180-250)

```typescript
// Track per mission:
- Iteration count (should be 3-5 for efficiency)
- Tool use count
- Success/failure outcome
- Quality score at end

// Acceptance: >90% of missions complete successfully
```

**Effort:** 2 days
**Success Criteria:** 100+ mission sample; 90+ succeed (>90% success rate)

#### 2.4 Memory Query Latency Optimization
**Modified Files:**
- `packages/jarvis-backend/src/memory/episodic.ts` (add parallel query)
- `packages/jarvis-backend/src/memory/semantic.ts` (add timeout guard)
- `packages/jarvis-backend/src/memory/hybrid.ts` (coordinate parallel queries)

```typescript
// Parallel query structure:
async queryAll(query: string): Promise<CompositeResult> {
    const [episodic, semantic, pattern] = await Promise.all([
        this.episodic.recall(query),
        this.semantic.query(query),
        this.pattern.query(query)
    ]);
    // Total latency: max(episodic, semantic, pattern) < 200ms
}
```

**Effort:** 1.5 days
**Success Criteria:** All 4 systems query in parallel; total < 200ms p95

#### 2.5 Squad Routing Accuracy Test
**File:** `packages/jarvis-backend/src/testing/routingTests.ts` (NEW)

```typescript
// Test 200 random user messages:
- Predict squad from intent
- Verify prediction matches expected squad
- Calculate accuracy rate
// Target: >95% accuracy
```

**Effort:** 1.5 days
**Success Criteria:** ≥95% routing accuracy on 200 test cases

#### 2.6 Quality Gate Enforcement Validation
**File:** Extend `packages/jarvis-backend/src/quality/gate.ts`

```typescript
// Verify:
- Missions with score < 75 are REJECTED (not passed)
- Rejected missions trigger RETRY (up to 3 times)
- Final decision after 3 retries: PASS or FAIL
- No score < 75 in production output
```

**Effort:** 1 day
**Success Criteria:** Quality gate enforces 75/100 threshold; no false passes

#### 2.7 Redis Streams Latency Measurement
**Modified File:** `packages/jarvis-backend/src/agent-bus/redis-streams.ts` (lines 100-150)

```typescript
// On message publish:
timestamp_ms = Date.now()
await stream.xadd(message + timestamp)

// On message consume:
const consumed_ms = Date.now()
const latency_ms = consumed_ms - message.timestamp_ms
// Target: <100ms p95
```

**Effort:** 1 day
**Success Criteria:** Message delivery < 100ms p95; alerts on violations

### Phase 2 Acceptance Criteria
- [ ] OODA cycle 30±2 min verified over 24h
- [ ] Consciousness cycle < 2h with all modules logged
- [ ] ReAct success rate > 90% (100+ mission sample)
- [ ] Squad routing accuracy > 95% (200 test cases)
- [ ] Memory queries < 200ms parallel
- [ ] Redis Streams < 100ms latency
- [ ] Quality gate 75/100 enforced (no false passes)
- [ ] All SLAs locked with metrics dashboard

---

## Phase 3: Tier 2 Integration & Deployment (Week 3-4)

**Goal:** Enable Tier 2 features and prepare for production deployment

### Tasks

#### 3.1 Mid-Thought Tool Calling
**Modified File:** `packages/jarvis-backend/src/agent.ts` (lines 20-70)

```typescript
// During ReAct loop, inject 3 internal tools:
const JARVIS_INTERNAL_TOOLS = [
    {
        name: 'recall_memory',
        description: 'Search episodic memory for similar missions',
        execute: async (query: string) => episodicMemory.recall(query)
    },
    {
        name: 'query_goals',
        description: 'Fetch active goals and OKRs from semantic memory',
        execute: async () => goalManager.getGoals()
    },
    {
        name: 'query_fact',
        description: 'Lookup specific fact from semantic memory',
        execute: async (key: string) => semanticMemory.getFact(key)
    }
];

// In ReAct loop iteration, include JARVIS_INTERNAL_TOOLS
// Target: >60% of missions use at least one tool mid-thought
```

**Effort:** 1.5 days
**Success Criteria:** Tool calls appear in >60% of missions; improve success rate by >5%

#### 3.2 DNA Mutation Tracking
**File:** `packages/jarvis-backend/src/mindclones/dnaEvolution.ts` (NEW)

```typescript
// Track per mutation:
- Proposal: Consciousness generates mutation
- Votes: Other agents vote yes/no
- Approval rate: (yes votes) / (total votes)
- Implementation: Approved mutations hot-loaded into registry

// Target: >3 mutations/week, >70% approval rate
```

**Effort:** 1 day
**Success Criteria:** Mutation vote tracking; >70% approval rate measured

#### 3.3 Briefing Section 5 Daily Generation
**File:** `packages/jarvis-backend/src/consciousness/briefingModule.ts` (NEW)

```typescript
// During nightly learning, Module 4 (Synthesis) generates:
- Top 3-5 strategic themes from web harvest
- Actionable recommendations per theme
- Market signals & trends
- Risk alerts

// Persist to semantic memory under key: `briefing_${YYYYMMDD}`
// Target: Daily briefing with 3+ themes, ready for dashboard
```

**Effort:** 1 day
**Success Criteria:** Daily briefing generated; Section 5 covers 3+ strategic themes

#### 3.4 Cost Tracking Accuracy
**File:** `packages/jarvis-backend/src/costs/tracker.ts` (NEW)

```typescript
// Track per request:
- Input tokens (from LLM response)
- Output tokens
- Model used (pricing varies)
- Calculate cost: (input_tokens/1000) * input_price + (output_tokens/1000) * output_price

// Reconcile against actual API billing
// Target: ±5% accuracy
```

**Effort:** 1.5 days
**Success Criteria:** Cost reconciliation within ±5% of actual API usage

#### 3.5 Sandbox Execution Validation
**File:** Extend `packages/jarvis-backend/src/security/sandbox.ts`

```typescript
// Security test suite:
- No breakouts (attempt access to require, process, fs)
- No eval() execution
- No Function() constructor
- Legitimate code succeeds > 98%

// Run 100+ test cases
```

**Effort:** 1.5 days
**Success Criteria:** 0 breakouts; legitimate code 98%+ success rate

#### 3.6 Load Testing
**File:** `packages/jarvis-backend/src/testing/loadTests.ts` (NEW)

```typescript
// Test scenarios:
- 5 concurrent squad missions (baseline)
- 10 concurrent squad missions
- 20 concurrent squad missions (stress)
- 100+ messages/sec through Redis Streams

// Measure:
- Latency p95 degradation < 20%
- No dropped messages
- Memory growth < 100MB over 1h
```

**Effort:** 2 days
**Success Criteria:** <20% latency degradation at 20 concurrent missions

#### 3.7 Operations Documentation
**Files:**
- `docs/OPERATIONS-RUNBOOK.md` (NEW)
- `docs/TROUBLESHOOTING.md` (extend)
- `docs/DEPLOYMENT-CHECKLIST.md` (NEW)

**Content:**
- How to monitor JARVIS health
- How to interpret Grafana metrics
- Troubleshooting guides for common failures
- Deployment procedure
- Rollback procedure
- Incident response playbook

**Effort:** 1 day
**Success Criteria:** Complete runbook; team can operate system without architect present

### Phase 3 Acceptance Criteria
- [ ] Mid-thought tool calling > 60% of missions
- [ ] DNA mutations > 70% approval rate
- [ ] Briefing Section 5 daily with 3+ themes
- [ ] Cost tracking ±5% accuracy
- [ ] Sandbox execution 100% contained (0 breakouts)
- [ ] Load test < 20% latency degradation
- [ ] Operations runbook complete
- [ ] **95/100 SIGN-OFF CHECKLIST PASSED**

---

## Critical Path & Dependencies

```
PHASE 1 (Week 1)
├─ Instrumentation (1d)
├─ OODA tests (1d)
├─ Memory tests (1.5d)
└─ Integration (2d) → Baseline metrics locked

PHASE 2 (Week 2) — Blocks on Phase 1
├─ OODA validator (1d) + Consciousness hardening (1.5d)
├─ ReAct success tracking (2d) [parallel to above]
├─ Squad routing test (1.5d) [parallel]
├─ Quality gate test (1d) [parallel]
├─ Memory optimization (1.5d) [parallel]
└─ Redis latency measure (1d) [parallel] → Tier 1 SLA locked

PHASE 3 (Week 3-4) — Blocks on Phase 2
├─ Mid-thought tools (1.5d)
├─ DNA tracking (1d)
├─ Briefing generation (1d)
├─ Cost tracker (1.5d)
├─ Sandbox validation (1.5d)
├─ Load tests (2d)
└─ Operations docs (1d) → Production-ready 95/100
```

**Total Timeline:** 9 days (sequential) + 5 days (parallel) = ~2-3 weeks expedited

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| Redis fails to deliver | Medium | High | Fallback to Promise.all queue (already in code) |
| Memory timeouts | Low | High | Per-query timeout (5s default); fallback to empty |
| Autonomy loop hangs | Low | Critical | Watchdog timer; force restart if >35 min |
| LLM outage | High | Medium | Fallback chain (DeepSeek → Gemini → Kimi) ✅ |
| Consciousness > 2h | Medium | Medium | Module timeout guards; skip slow modules |
| Test flakiness | Medium | Medium | Retry logic + deterministic seeding |
| Quality gate false positives | Low | Low | Fallback evaluation ✅ |
| Cost overruns | Medium | Medium | Budget cap + daily reset ✅ |

---

## Success Metrics (95/100 Definition)

**Tier 1 (8 items, 50% weight):**
- ✅ OODA 30±2 min (verified 24h)
- ✅ Consciousness < 2h (all modules)
- ✅ Squad routing > 95% (200 tests)
- ✅ Memory < 200ms (parallel)
- ✅ ReAct > 90% success (100+ missions)
- ✅ Autonomy decisions (confidence threshold)
- ✅ Redis < 100ms (latency p95)
- ✅ Quality gate 75/100 (enforcement)

**Tier 2 (4 items, 50% weight):**
- ✅ Mid-thought > 60% (tool tracking)
- ✅ DNA mutations > 70% approval
- ✅ Briefing daily Section 5
- ✅ Cost tracking ±5%

**95/100 Score:** (8/8 Tier 1 × 50%) + (3/4 Tier 2 × 50%) = **87.5%** → **8/8 Tier 1 + 3 Tier 2 items minimum**

---

## Critical Implementation Notes

1. **Every change must include:** Logging ([COMPONENT] tags), metrics, alerts, dashboard
2. **Confidence tuning:** Collect >100 actual decisions; adjust thresholds based on calibration error
3. **Memory optimization:** Profile independently; consider caching + read replicas
4. **ReAct safety:** Add `MAX_REACT_ITERATIONS = 10` to prevent infinite loops
5. **Consciousness graceful degradation:** Skip slow modules; don't wait for them

---

## Files to Create/Modify Summary

**New Files (7):**
- `instrumentation/metricsCollector.ts`
- `autonomy/cycleValidator.ts`
- `consciousness/cycleHardening.ts`
- `consciousness/briefingModule.ts`
- `costs/tracker.ts`
- `mindclones/dnaEvolution.ts`
- `testing/autonomyTests.ts`, `memoryTests.ts`, `routingTests.ts`, `loadTests.ts`

**Modified Files (8):**
- `autonomy.ts` (metrics + validation integration)
- `consciousness/nightlyLearning.ts` (timeouts + graceful degradation)
- `agent.ts` (mid-thought tools + success tracking)
- `index.ts` (metrics initialization)
- `memory/episodic.ts` (latency instrumentation)
- `memory/semantic.ts` (query timeout)
- `memory/hybrid.ts` (parallel coordination)
- `agent-bus/redis-streams.ts` (latency measurement)

---

**Status:** APPROVED FOR EXECUTION | PHASE 1 STARTS IMMEDIATELY

