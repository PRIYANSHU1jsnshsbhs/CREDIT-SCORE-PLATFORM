#!/bin/bash
# Polygon Amoy Deployment Script

echo "🚀 Deploying OnChainScore to Polygon Amoy..."
echo "📍 Network: Polygon Amoy (Chain ID: 80002)"
echo "🔑 Deployer: 0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855"
echo ""

# Check balance first
echo "💰 Checking wallet balance..."
balance=$(cast balance 0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855 --rpc-url https://polygon-amoy.g.alchemy.com/v2/XIwMygm-CuVoWL7QoNyV8BCmEzvN4s5q)
balance_matic=$(cast from-wei $balance)
echo "Current balance: $balance_matic MATIC"

if (( $(echo "$balance_matic < 2.5" | bc -l) )); then
  echo "❌ Insufficient funds! Need at least 2.5 MATIC for deployment."
  echo "💡 Get testnet tokens from:"
  echo "   - https://faucet.polygon.technology/"
  echo "   - https://www.alchemy.com/faucets/polygon-amoy"
  echo "   Address: 0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855"
  exit 1
fi

echo "✅ Sufficient balance for deployment!"
echo ""

# Deploy the contract
echo "📜 Deploying smart contract..."
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url https://polygon-amoy.g.alchemy.com/v2/XIwMygm-CuVoWL7QoNyV8BCmEzvN4s5q \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

echo ""
echo "🎉 Deployment complete!"
echo "🔗 View on PolygonScan: https://amoy.polygonscan.com/"
