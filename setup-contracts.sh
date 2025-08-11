#!/bin/bash

echo "🚀 OnChain Score Backend - Smart Contract Setup"
echo "==============================================="

# Main backend dependencies
echo "📦 Installing main backend dependencies..."
npm install

# Smart contract dependencies
echo "📦 Installing smart contract dependencies..."
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts ethers

echo "📦 Installing additional Web3 utilities..."
npm install ethers @ethersproject/providers @ethersproject/contracts

# Create directories
echo "📁 Creating necessary directories..."
mkdir -p contracts/scripts
mkdir -p contracts/test
mkdir -p abis
mkdir -p bytecode
mkdir -p deployments

# Initialize Hardhat project in contracts directory
echo "⚡ Initializing Hardhat project..."
cd contracts && npx hardhat --version

echo ""
echo "🎉 Smart Contract setup complete!"
echo ""
echo "Available commands:"
echo "  npm run compile           - Compile smart contracts"
echo "  npm run deploy:mumbai     - Deploy to Polygon Mumbai testnet"
echo "  npm run deploy:polygon    - Deploy to Polygon mainnet"
echo "  npm run test              - Run smart contract tests"
echo "  npm run node              - Start local Hardhat network"
echo ""
echo "Next steps:"
echo "1. Add PRIVATE_KEY to .env for contract deployment"
echo "2. Add RPC URLs for different networks"
echo "3. Run 'npm run compile' to compile contracts"
echo "4. Run 'npm run deploy:mumbai' to deploy to testnet"
echo ""
