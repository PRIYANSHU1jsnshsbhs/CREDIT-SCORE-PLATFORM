#!/bin/bash
# Ethereum Sepolia Deployment Script

echo "🚀 Deploying OnChainScore to Ethereum Sepolia..."
echo "📍 Network: Ethereum Sepolia (Chain ID: 11155111)"
echo "🔑 Deployer: 0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855"
echo ""

# Check Sepolia balance
echo "💰 Checking Sepolia ETH balance..."
balance=$(cast balance 0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855 --rpc-url https://eth-sepolia.g.alchemy.com/public)
balance_eth=$(cast from-wei $balance)
echo "Current Sepolia balance: $balance_eth ETH"

if (( $(echo "$balance_eth < 0.1" | bc -l) )); then
  echo "❌ Insufficient funds! Need at least 0.1 ETH for deployment."
  exit 1
fi

echo "✅ Sufficient balance for deployment!"
echo ""

# Deploy the contract to Sepolia
echo "📜 Deploying smart contract to Sepolia..."
forge script scripts/Deploy.s.sol:DeployScript \
  --rpc-url https://eth-sepolia.g.alchemy.com/public \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

echo ""
echo "🎉 Deployment complete!"
echo "🔗 View on Etherscan: https://sepolia.etherscan.io/"
