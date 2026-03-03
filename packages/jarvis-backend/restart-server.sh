#!/bin/bash
echo "Killing old server..."
pkill -9 node 2>/dev/null || true
sleep 2

echo "Starting new server..."
npm run dev > server-final.log 2>&1 &
echo "Server started, waiting for initialization..."
sleep 20

echo "Testing /api/health..."
curl -s http://localhost:3000/api/health | head -c 100
echo ""
echo "Testing /api/costs/metrics..."
curl -s http://localhost:3000/api/costs/metrics | head -c 200

