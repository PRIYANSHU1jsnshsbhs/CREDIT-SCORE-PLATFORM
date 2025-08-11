#!/bin/bash

# Test with a different wallet to verify scoring works
cd "$(dirname "$0")"

# Start server in background
node real-server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo "Testing with a different wallet (smaller portfolio)..."

# Test with a less active wallet
curl -s "http://localhost:9000/api/score/0x742d35Cc6634C0532925a3b8D05B4B5b0b46f7df" | jq '{
  totalScore: .totalScore,
  tier: .tier,
  fallbackMode: .fallbackMode,
  components: {
    portfolioScore: .details.portfolioScore,
    activityScore: .details.activityScore,
    defiScore: .details.defiScore,
    diversificationScore: .details.diversificationScore,
    securityScore: .details.securityScore,
    identityScore: .details.identityScore,
    profitabilityScore: .details.profitabilityScore
  },
  wallet: {
    netWorth: .details.netWorth,
    totalTokens: .details.totalTokens,
    totalNFTs: .details.totalNFTs,
    transactionCount: .details.transactionCount,
    walletAgeMonths: .details.walletAgeMonths
  }
}'

echo ""
echo "Testing with an empty/new wallet..."

# Test with a wallet that might have no tokens
curl -s "http://localhost:9000/api/score/0x0000000000000000000000000000000000000001" | jq '{
  totalScore: .totalScore,
  tier: .tier,
  fallbackMode: .fallbackMode,
  components: {
    portfolioScore: .details.portfolioScore,
    securityScore: .details.securityScore,
    profitabilityScore: .details.profitabilityScore
  },
  wallet: {
    totalTokens: .details.totalTokens,
    transactionCount: .details.transactionCount,
    walletAgeMonths: .details.walletAgeMonths
  }
}'

# Clean up
kill $SERVER_PID 2>/dev/null
