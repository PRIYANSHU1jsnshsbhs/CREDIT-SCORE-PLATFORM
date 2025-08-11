#!/bin/bash

echo "🚀 OnChain Score Backend - Quick Setup Script"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file and add your Moralis API key!"
    echo "   Get your free API key from: https://moralis.io"
    echo ""
    echo "   1. Sign up at moralis.io"
    echo "   2. Go to Web3 APIs section"  
    echo "   3. Copy your API key"
    echo "   4. Replace 'your_moralis_api_key_here' in .env file"
    echo ""
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Moralis API key"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:9000"
echo ""
echo "For detailed instructions, see README.md"
