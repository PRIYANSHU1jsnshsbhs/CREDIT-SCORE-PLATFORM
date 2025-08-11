#!/bin/bash
# Polygon Mumbai Deployment Script (Alternative)

echo "🚀 Deploying OnChainScore to Polygon Mumbai..."
echo "📍 Network: Polygon Mumbai (Chain ID: 80001)"
echo "🔑 Deployer: 0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855"
echo ""

# Check balance first
echo "💰 Checking wallet balance..."
balance=$(cast balance 0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855 --rpc-url https://rpc-mumbai.maticvigil.com/)
balance_matic=$(cast from-wei $balance)
echo "Current Mumbai balance: $balance_matic MATIC"

if (( $(echo "$balance_matic < 2.5" | bc -l) )); then
  echo "❌ Insufficient funds!"
  echo "💡 Get Mumbai testnet tokens from:"
  echo "   - https://faucet.polygon.technology/ (select Mumbai)"
  echo "   - https://mumbaifaucet.com/"
  echo "   Address: 0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855"
  exit 1
fi

echo "✅ Sufficient balance for deployment!"

# Deploy the contract
echo "📜 Deploying smart contract..."
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url https://rpc-mumbai.maticvigil.com/ \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

echo ""
echo "🎉 Mumbai deployment complete!"
echo "🔗 View on PolygonScan: https://mumbai.polygonscan.com/"
