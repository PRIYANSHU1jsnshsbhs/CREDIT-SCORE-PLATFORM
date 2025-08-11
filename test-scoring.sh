#!/bin/bash
cd /home/priyanshu/moralis-api-test/onchain-score-backend

# Kill any existing server
fuser -k 9000/tcp 2>/dev/null || true
sleep 0.5

# Start server in background
node real-server.js &
SERVER_PID=$!

# Wait for startup
sleep 1.5

echo "Testing wallet scoring with fixed logic..."

# Test the specific address
curl -sS -X POST http://localhost:9000/api/calculate-onchain-score \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","chains":["eth","polygon","bsc","arbitrum"]}' \
  | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('=== WALLET SCORING RESULTS ===')
    print(f'Address: {data.get(\"walletAddress\", \"N/A\")}')
    print(f'Total Score: {data.get(\"score\", 0)}/{data.get(\"maxScore\", 100)}')
    print(f'Tier: {data.get(\"tier\", \"N/A\")}')
    print(f'Fallback Mode: {data.get(\"fallbackMode\", False)}')
    print('')
    print('=== COMPONENT SCORES ===')
    breakdown = data.get('breakdown', {})
    for component, score in breakdown.items():
        print(f'{component}: {score}')
    print('')
    print('=== WALLET DETAILS ===')  
    details = data.get('details', {})
    for key, value in details.items():
        if key == 'defiProtocols' and isinstance(value, list):
            print(f'{key}: {len(value)} protocols ({value[:3]}...)')
        else:
            print(f'{key}: {value}')
except Exception as e:
    print('Error parsing response:', str(e))
    print('Raw response:')
    print(sys.stdin.read())
"

# Clean up
kill $SERVER_PID 2>/dev/null || true
