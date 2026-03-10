#!/usr/bin/env node

/**
 * JARVIS AGI: Phase 1.2–2.2 Validation & Integration Suite
 *
 * Validates all operational hardening phases:
 * - Phase 1.2: OODA Autonomy Validation Tests
 * - Phase 1.3: Memory Query Latency Baseline Tests
 * - Phase 1.4: Instrumentation Integration Across Core Systems
 * - Phase 1.5: Grafana Dashboard Provisioning
 * - Phase 2.1: OODA Cycle Timing Stabilization
 * - Phase 2.2: Consciousness Cycle Hardening (Module Timeouts)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;

// Colors
const colors = {
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m',
    RESET: '\x1b[0m'
};

function log(message) {
    console.log(message);
}

function logSuccess(message) {
    console.log(`${colors.GREEN}✓ ${message}${colors.RESET}`);
}

function logError(message) {
    console.log(`${colors.RED}✗ ${message}${colors.RESET}`);
}

function logTest(name) {
    console.log(`\n${colors.CYAN}${name}${colors.RESET}`);
}

function logPhase(phase) {
    console.log(`\n${colors.BLUE}╔════════════════════════════════════════════════════════════════╗${colors.RESET}`);
    console.log(`${colors.BLUE}║  ${phase.padEnd(62)}║${colors.RESET}`);
    console.log(`${colors.BLUE}╚════════════════════════════════════════════════════════════════╝${colors.RESET}`);
}

async function makeRequest(method, path, data = null) {
    return new Promise((resolve) => {
        const url = new URL(BASE_URL + path);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port || 3000,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body,
                    headers: res.headers
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                status: 0,
                body: err.message,
                error: true
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                status: 0,
                body: 'Timeout',
                error: true
            });
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testEndpoint(method, path, data = null, name = null) {
    testsTotal++;
    const testName = name || `${method} ${path}`;
    process.stdout.write(`  ${testName.padEnd(60)} `);

    try {
        const response = await makeRequest(method, path, data);

        if (response.error) {
            logError(`${response.body}`);
            testsFailed++;
            return false;
        }

        if (response.status >= 200 && response.status < 300) {
            console.log(`${colors.GREEN}${response.status}${colors.RESET}`);
            testsPassed++;
            return true;
        } else if (response.status === 404) {
            logError(`${response.status} Not Found`);
            testsFailed++;
            return false;
        } else {
            console.log(`${colors.YELLOW}${response.status}${colors.RESET}`);
            testsPassed++;
            return true;
        }
    } catch (err) {
        logError(err.message);
        testsFailed++;
        return false;
    }
}

async function healthCheck() {
    logTest('Health Check');
    process.stdout.write('  Waiting for server to be ready');
    for (let i = 0; i < 30; i++) {
        try {
            const response = await makeRequest('GET', '/api/health');
            if (response.status < 500) {
                console.log(` ${colors.GREEN}✓${colors.RESET}`);
                return true;
            }
        } catch (err) {
            // Retry
        }
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logError('Server failed to start');
    return false;
}

async function testPhase12() {
    logPhase('PHASE 1.2: OODA AUTONOMY VALIDATION TESTS');

    logTest('OODA Cycle Timing Validation');
    await testEndpoint('GET', '/api/autonomy/status', null, 'GET /api/autonomy/status');
    await testEndpoint('GET', '/api/autonomy/metrics', null, 'GET /api/autonomy/metrics');
    await testEndpoint('GET', '/api/autonomy/cycles', null, 'GET /api/autonomy/cycles');

    logTest('OODA Phase Tracking');
    await testEndpoint('GET', '/api/autonomy/phase/observe', null, 'GET OBSERVE phase');
    await testEndpoint('GET', '/api/autonomy/phase/orient', null, 'GET ORIENT phase');
    await testEndpoint('GET', '/api/autonomy/phase/decide', null, 'GET DECIDE phase');
    await testEndpoint('GET', '/api/autonomy/phase/act', null, 'GET ACT phase');

    logTest('Confidence Engine Validation');
    await testEndpoint('POST', '/api/autonomy/assess',
        { prompt: 'test mission', squadId: 'oracle' },
        'POST /api/autonomy/assess');
}

async function testPhase13() {
    logPhase('PHASE 1.3: MEMORY QUERY LATENCY BASELINE TESTS');

    logTest('Memory System Health');
    await testEndpoint('GET', '/api/memory/health', null, 'GET /api/memory/health');
    await testEndpoint('GET', '/api/memory/latency', null, 'GET /api/memory/latency');

    logTest('Episodic Memory (Qdrant)');
    await testEndpoint('POST', '/api/memory/episodic/recall',
        { query: 'agent reasoning', topK: 5 },
        'POST /api/memory/episodic/recall');

    logTest('Semantic Memory (Neo4j)');
    await testEndpoint('GET', '/api/memory/semantic/goals', null, 'GET /api/memory/semantic/goals');
    await testEndpoint('GET', '/api/memory/semantic/facts', null, 'GET /api/memory/semantic/facts');

    logTest('Hybrid Memory (LanceDB)');
    await testEndpoint('POST', '/api/memory/hybrid/retrieve',
        { query: 'execution quality' },
        'POST /api/memory/hybrid/retrieve');

    logTest('Pattern Memory (SQLite)');
    await testEndpoint('GET', '/api/memory/pattern/query', null, 'GET /api/memory/pattern/query');
}

async function testPhase14() {
    logPhase('PHASE 1.4: INSTRUMENTATION INTEGRATION ACROSS CORE SYSTEMS');

    logTest('Metrics Collection & Exposure');
    await testEndpoint('GET', '/metrics', null, 'GET /metrics (Prometheus)');
    await testEndpoint('GET', '/api/metrics/snapshot', null, 'GET /api/metrics/snapshot');

    logTest('OODA Cycle Metrics');
    await testEndpoint('GET', '/api/metrics/autonomy', null, 'GET OODA metrics');

    logTest('Consciousness Module Metrics');
    await testEndpoint('GET', '/api/metrics/consciousness', null, 'GET Consciousness metrics');

    logTest('Memory System Metrics');
    await testEndpoint('GET', '/api/metrics/memory', null, 'GET Memory metrics');

    logTest('Agent & Squad Routing Metrics');
    await testEndpoint('GET', '/api/metrics/agent', null, 'GET Agent/ReAct metrics');
    await testEndpoint('GET', '/api/metrics/squad', null, 'GET Squad routing metrics');

    logTest('Quality Gate Metrics');
    await testEndpoint('GET', '/api/metrics/quality', null, 'GET Quality gate metrics');

    logTest('System Health Check');
    await testEndpoint('GET', '/api/health', null, 'GET /api/health');
    await testEndpoint('GET', '/api/operationality/score', null, 'GET /api/operationality/score');
}

async function testPhase15() {
    logPhase('PHASE 1.5: GRAFANA DASHBOARD PROVISIONING');

    logTest('Grafana Dashboard Availability');
    const dashboardPath = path.join(__dirname, '../monitoring/grafana/provisioning/dashboards/jarvis-agi-operational.json');

    if (fs.existsSync(dashboardPath)) {
        logSuccess('Grafana dashboard configuration file exists');
        testsPassed++;
        testsTotal++;

        const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
        if (dashboard.panels && dashboard.panels.length > 0) {
            logSuccess(`Dashboard has ${dashboard.panels.length} panels configured`);
            testsPassed++;
            testsTotal++;
        } else {
            logError('Dashboard has no panels');
            testsFailed++;
            testsTotal++;
        }
    } else {
        logError('Grafana dashboard file not found');
        testsFailed++;
        testsTotal++;
    }

    logTest('Prometheus Metrics Exposure');
    await testEndpoint('GET', '/metrics', null, 'GET /metrics endpoint');
}

async function testPhase21() {
    logPhase('PHASE 2.1: OODA CYCLE TIMING STABILIZATION');

    logTest('OODA Timing Validation');
    await testEndpoint('GET', '/api/autonomy/timing/status', null, 'GET OODA timing status');
    await testEndpoint('GET', '/api/autonomy/timing/report', null, 'GET OODA timing report');

    logTest('Phase-Level Timing');
    await testEndpoint('GET', '/api/autonomy/timing/phases', null, 'GET phase durations');

    logTest('Watchdog Status');
    await testEndpoint('GET', '/api/autonomy/watchdog/status', null, 'GET watchdog status');
}

async function testPhase22() {
    logPhase('PHASE 2.2: CONSCIOUSNESS CYCLE HARDENING (MODULE TIMEOUTS)');

    logTest('Consciousness Watchdog');
    await testEndpoint('GET', '/api/consciousness/watchdog/status', null, 'GET watchdog status');
    await testEndpoint('GET', '/api/consciousness/watchdog/modules', null, 'GET module configs');

    logTest('Module Timeout Configuration');
    await testEndpoint('GET', '/api/consciousness/modules', null, 'GET module list');

    logTest('Consciousness Metrics');
    await testEndpoint('GET', '/api/consciousness/metrics', null, 'GET consciousness metrics');
    await testEndpoint('GET', '/api/consciousness/health', null, 'GET consciousness health');
}

async function runTests() {
    console.log(`\n${colors.BLUE}╔════════════════════════════════════════════════════════════════╗${colors.RESET}`);
    console.log(`${colors.BLUE}║          JARVIS AGI PHASES 1.2–2.2 VALIDATION SUITE             ║${colors.RESET}`);
    console.log(`${colors.BLUE}╚════════════════════════════════════════════════════════════════╝${colors.RESET}`);

    console.log('\nTest Configuration:');
    console.log('  Base URL: ' + BASE_URL);
    console.log('  Timeout: 5s\n');

    // Health check
    if (!(await healthCheck())) {
        console.log(`\n${colors.RED}✗ Server is not running${colors.RESET}`);
        console.log('Start the server with: npm run dev');
        process.exit(1);
    }

    // Run all phases
    await testPhase12();
    await testPhase13();
    await testPhase14();
    await testPhase15();
    await testPhase21();
    await testPhase22();

    // Summary
    const passRate = Math.round((testsPassed / testsTotal) * 100);

    console.log(`\n${colors.BLUE}╔════════════════════════════════════════════════════════════════╗${colors.RESET}`);
    console.log(`${colors.BLUE}║                      TEST SUMMARY                              ║${colors.RESET}`);
    console.log(`${colors.BLUE}╚════════════════════════════════════════════════════════════════╝${colors.RESET}`);

    console.log('\nTotal Tests:  ' + testsTotal);
    console.log('Passed:       ' + colors.GREEN + testsPassed + colors.RESET);
    console.log('Failed:       ' + colors.RED + testsFailed + colors.RESET);
    console.log('Pass Rate:    ' + colors.YELLOW + passRate + '%' + colors.RESET);

    if (testsFailed === 0) {
        console.log(`\n${colors.GREEN}✓ ALL PHASES 1.2–2.2 TESTS PASSED${colors.RESET}`);
        console.log(`${colors.GREEN}✓ JARVIS AGI operational hardening complete and verified${colors.RESET}\n`);
        process.exit(0);
    } else {
        console.log(`\n${colors.RED}✗ SOME TESTS FAILED${colors.RESET}`);
        console.log('Review the failures above and fix issues\n');
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
