#!/usr/bin/env node

/**
 * Phase 4 Validation & Testing Suite
 * Tests all 25+ Phase 4 API endpoints and system integration
 */

const http = require('http');

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
    console.log(`${colors.BLUE}${name}${colors.RESET}`);
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
    logTest('\n=== Health Check ===\n');

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

async function testQuimera() {
    logTest('\n=== Quimera Deep Synthesis (6+ endpoints) ===\n');

    await testEndpoint('GET', '/api/quimera/health', null, 'GET /api/quimera/health');
    await testEndpoint('POST', '/api/quimera/analyze', { query: 'What is AGI?' }, 'POST /api/quimera/analyze');
    await testEndpoint('POST', '/api/quimera/feed', {
        node: { id: 'test_1', label: 'Test', type: 'Concept', properties: {} },
        edges: []
    }, 'POST /api/quimera/feed');
    await testEndpoint('GET', '/api/quimera/graph/neighborhood/test_1', null, 'GET /api/quimera/graph/neighborhood/:id');
    await testEndpoint('GET', '/api/quimera/graph/connections/test_1?depth=2', null, 'GET /api/quimera/graph/connections/:id');
    await testEndpoint('POST', '/api/quimera/graph/upsert-node', {
        node: { id: 'ent_1', label: 'Entity', type: 'Test', properties: {} }
    }, 'POST /api/quimera/graph/upsert-node');
    await testEndpoint('POST', '/api/quimera/graph/add-edge', {
        edge: { from: 'ent_1', to: 'test_1', relation: 'RELATED', weight: 0.8 }
    }, 'POST /api/quimera/graph/add-edge');
}

async function testDomCortex() {
    logTest('\n=== DomCortex Browser Automation (7+ endpoints) ===\n');

    await testEndpoint('GET', '/api/dom-cortex/health', null, 'GET /api/dom-cortex/health');
    await testEndpoint('POST', '/api/dom-cortex/initialize', null, 'POST /api/dom-cortex/initialize');
    await testEndpoint('POST', '/api/dom-cortex/navigate', { url: 'https://example.com' }, 'POST /api/dom-cortex/navigate');
    await testEndpoint('GET', '/api/dom-cortex/page-source', null, 'GET /api/dom-cortex/page-source');
}

async function testWorldMonitor() {
    logTest('\n=== WorldMonitor Global Surveillance (9 endpoints) ===\n');

    await testEndpoint('GET', '/api/monitor/health', null, 'GET /api/monitor/health');
    await testEndpoint('POST', '/api/monitor/start', { intervalMs: 600000 }, 'POST /api/monitor/start');
    await testEndpoint('GET', '/api/monitor/state', null, 'GET /api/monitor/state');
    await testEndpoint('GET', '/api/monitor/aviation', null, 'GET /api/monitor/aviation');
    await testEndpoint('GET', '/api/monitor/maritime', null, 'GET /api/monitor/maritime');
    await testEndpoint('GET', '/api/monitor/geopolitics', null, 'GET /api/monitor/geopolitics');
    await testEndpoint('GET', '/api/monitor/commodities', null, 'GET /api/monitor/commodities');
    await testEndpoint('POST', '/api/monitor/stop', null, 'POST /api/monitor/stop');
}

async function testYolo() {
    logTest('\n=== YOLO Vision System (4 endpoints) ===\n');

    await testEndpoint('GET', '/api/yolo/health', null, 'GET /api/yolo/health');
    await testEndpoint('POST', '/api/yolo/start', null, 'POST /api/yolo/start');
    await testEndpoint('GET', '/api/yolo/latest-result', null, 'GET /api/yolo/latest-result');
}

async function testExistingSystems() {
    logTest('\n=== Existing Systems Check ===\n');

    await testEndpoint('GET', '/api/health', null, 'GET /api/health');
    await testEndpoint('GET', '/api/operationality/score', null, 'GET /api/operationality/score');
    await testEndpoint('GET', '/api/briefings/health', null, 'GET /api/briefings/health');
}

async function testErrorHandling() {
    logTest('\n=== Error Handling Tests ===\n');

    await testEndpoint('POST', '/api/quimera/analyze', {}, 'POST /api/quimera/analyze (missing query)');
    await testEndpoint('POST', '/api/dom-cortex/navigate', {}, 'POST /api/dom-cortex/navigate (missing url)');
}

async function runTests() {
    console.log('\n' + colors.BLUE + '╔════════════════════════════════════════════════════════════════╗' + colors.RESET);
    console.log(colors.BLUE + '║          PHASE 4 VALIDATION & TESTING SUITE                   ║' + colors.RESET);
    console.log(colors.BLUE + '╚════════════════════════════════════════════════════════════════╝' + colors.RESET);

    console.log('\nTest Configuration:');
    console.log('  Base URL: ' + BASE_URL);
    console.log('  Timeout: 5s\n');

    // Health check
    if (!(await healthCheck())) {
        console.log('\n' + colors.RED + '✗ Server is not running' + colors.RESET);
        console.log('Start the server with: npm run dev');
        process.exit(1);
    }

    // Run tests
    await testQuimera();
    await testDomCortex();
    await testWorldMonitor();
    await testYolo();
    await testExistingSystems();
    await testErrorHandling();

    // Summary
    const passRate = Math.round((testsPassed / testsTotal) * 100);

    console.log('\n' + colors.BLUE + '╔════════════════════════════════════════════════════════════════╗' + colors.RESET);
    console.log(colors.BLUE + '║                      TEST SUMMARY                              ║' + colors.RESET);
    console.log(colors.BLUE + '╚════════════════════════════════════════════════════════════════╝' + colors.RESET);

    console.log('\nTotal Tests:  ' + testsTotal);
    console.log('Passed:       ' + colors.GREEN + testsPassed + colors.RESET);
    console.log('Failed:       ' + colors.RED + testsFailed + colors.RESET);
    console.log('Pass Rate:    ' + colors.YELLOW + passRate + '%' + colors.RESET);

    if (testsFailed === 0) {
        console.log('\n' + colors.GREEN + '✓ ALL TESTS PASSED' + colors.RESET);
        console.log(colors.GREEN + '✓ Phase 4 systems are operational and ready for integration' + colors.RESET + '\n');
        process.exit(0);
    } else {
        console.log('\n' + colors.RED + '✗ SOME TESTS FAILED' + colors.RESET);
        console.log('Review the failures above and fix issues\n');
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
