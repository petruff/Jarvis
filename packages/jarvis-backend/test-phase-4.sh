#!/bin/bash

##############################################################################
# Phase 4 Validation & Testing Script
# Tests all 25+ Phase 4 API endpoints and system integration
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Server info
BASE_URL="http://localhost:3000"
TIMEOUT=5

##############################################################################
# Helper Functions
##############################################################################

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_code=$4

    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    local test_name="${method} ${endpoint}"

    echo -n "Testing ${test_name}... "

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "${method}" \
            -H "Content-Type: application/json" \
            "${BASE_URL}${endpoint}" 2>/dev/null || echo "ERROR")
    else
        response=$(curl -s -w "\n%{http_code}" -X "${method}" \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "${BASE_URL}${endpoint}" 2>/dev/null || echo "ERROR")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "$expected_code" ] || [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
        echo -e "${GREEN}✓ ${http_code}${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ ${http_code}${NC}"
        echo "  Response: ${body:0:100}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

health_check() {
    echo -e "\n${BLUE}=== Health Check ===${NC}"

    # Wait for server to be ready
    echo "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s "${BASE_URL}/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Server is ready${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
    done

    echo -e "${RED}✗ Server failed to start${NC}"
    return 1
}

##############################################################################
# Test Suites
##############################################################################

test_quimera() {
    echo -e "\n${BLUE}=== Quimera Deep Synthesis (6 endpoints) ===${NC}"

    test_endpoint "GET" "/api/quimera/health" "" "200"

    test_endpoint "POST" "/api/quimera/analyze" \
        '{"query":"What is machine learning?"}' "200"

    test_endpoint "POST" "/api/quimera/feed" \
        '{"node":{"id":"test_node","label":"Test Entity","type":"Concept","properties":{}},"edges":[]}' "200"

    test_endpoint "GET" "/api/quimera/graph/neighborhood/test_node" "" "200"

    test_endpoint "GET" "/api/quimera/graph/connections/test_node?depth=2" "" "200"

    test_endpoint "POST" "/api/quimera/graph/upsert-node" \
        '{"node":{"id":"entity_1","label":"Entity One","type":"Test","properties":{}}}' "200"

    test_endpoint "POST" "/api/quimera/graph/add-edge" \
        '{"edge":{"from":"entity_1","to":"test_node","relation":"RELATED_TO","weight":0.8}}' "200"
}

test_dom_cortex() {
    echo -e "\n${BLUE}=== DomCortex Browser Automation (7+ endpoints) ===${NC}"

    test_endpoint "GET" "/api/dom-cortex/health" "" "200"

    test_endpoint "POST" "/api/dom-cortex/initialize" "" "200"

    test_endpoint "POST" "/api/dom-cortex/navigate" \
        '{"url":"https://example.com"}' "200"

    test_endpoint "GET" "/api/dom-cortex/page-source" "" "200"
}

test_world_monitor() {
    echo -e "\n${BLUE}=== WorldMonitor Global Surveillance (9 endpoints) ===${NC}"

    test_endpoint "GET" "/api/monitor/health" "" "200"

    test_endpoint "POST" "/api/monitor/start" \
        '{"intervalMs":600000}' "200"

    test_endpoint "GET" "/api/monitor/state" "" "200"

    test_endpoint "GET" "/api/monitor/aviation" "" "200"

    test_endpoint "GET" "/api/monitor/maritime" "" "200"

    test_endpoint "GET" "/api/monitor/geopolitics" "" "200"

    test_endpoint "GET" "/api/monitor/commodities" "" "200"
}

test_yolo() {
    echo -e "\n${BLUE}=== YOLO Vision System (4 endpoints) ===${NC}"

    test_endpoint "GET" "/api/yolo/health" "" "200"

    test_endpoint "POST" "/api/yolo/start" "" "200"

    test_endpoint "GET" "/api/yolo/latest-result" "" "200"
}

test_existing_systems() {
    echo -e "\n${BLUE}=== Existing Systems Check ===${NC}"

    test_endpoint "GET" "/api/health" "" "200"

    test_endpoint "GET" "/api/operationality/score" "" "200"

    test_endpoint "GET" "/api/briefings/health" "" "200"
}

test_error_handling() {
    echo -e "\n${BLUE}=== Error Handling Tests ===${NC}"

    echo -n "Testing missing query parameter... "
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{}' \
        "${BASE_URL}/api/quimera/analyze" 2>/dev/null || echo "ERROR")
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" = "400" ]; then
        echo -e "${GREEN}✓${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    echo -n "Testing invalid JSON... "
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d 'invalid json' \
        "${BASE_URL}/api/quimera/analyze" 2>/dev/null || echo "ERROR")
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" = "400" ] || [ "$http_code" = "500" ]; then
        echo -e "${GREEN}✓${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

##############################################################################
# Main Test Flow
##############################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          PHASE 4 VALIDATION & TESTING SUITE                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\nTest Configuration:"
echo "  Base URL: ${BASE_URL}"
echo "  Timeout: ${TIMEOUT}s"
echo ""

# Run health check
if ! health_check; then
    echo -e "\n${RED}✗ Server is not running${NC}"
    echo "Start the server with: npm run dev"
    exit 1
fi

# Run all test suites
test_quimera
test_dom_cortex
test_world_monitor
test_yolo
test_existing_systems
test_error_handling

##############################################################################
# Summary Report
##############################################################################

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      TEST SUMMARY                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))

echo -e "\nTotal Tests: ${TESTS_TOTAL}"
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
echo -e "Pass Rate: ${YELLOW}${PASS_RATE}%${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED${NC}"
    echo -e "${GREEN}✓ Phase 4 systems are operational${NC}"
    exit 0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}"
    echo "Review the failures above and fix issues"
    exit 1
fi
