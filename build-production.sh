#!/bin/bash

# Production Build Script for OnChain Score NFT Certificate System

echo "🚀 Building OnChain Score NFT Certificate System for Production..."
echo

# Check if we're in the right directory
if [ ! -f "real-server.js" ]; then
    echo "❌ Error: Must run from onchain-score-backend directory"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Build React frontend
echo "⚛️ Building React frontend..."
cd react-frontend
npm install
npm run build

echo
echo "✅ Build completed successfully!"
echo
echo "🎯 Available frontends:"
echo "   🔥 React Development: http://localhost:3000/ (npm run dev in react-frontend/)"
echo "   🌟 HTML Production:   http://localhost:9000/ (node real-server.js)"
echo "   📱 Legacy Version:    http://localhost:9000/nft.html"
echo
echo "🚀 To start production server:"
echo "   node real-server.js"
echo
echo "🎮 To start development:"
echo "   Terminal 1: node real-server.js"
echo "   Terminal 2: cd react-frontend && npm run dev"
echo
