#!/bin/bash

echo "🎖️ Badge Integration Setup Script"
echo "================================="
echo

# Check if badge image exists (PNG, JPG, or JPEG)
if [ ! -f "images/all-badges.png" ] && [ ! -f "images/all-badges.jpg" ] && [ ! -f "images/all-badges.jpeg" ]; then
    echo "❌ Badge image not found!"
    echo "📸 Please save your badge image as one of:"
    echo "   - images/all-badges.png"
    echo "   - images/all-badges.jpg" 
    echo "   - images/all-badges.jpeg"
    echo "   Then run this script again"
    echo
    exit 1
fi

if [ -f "images/all-badges.png" ]; then
    echo "✅ Badge image found: images/all-badges.png"
elif [ -f "images/all-badges.jpg" ]; then
    echo "✅ Badge image found: images/all-badges.jpg"  
elif [ -f "images/all-badges.jpeg" ]; then
    echo "✅ Badge image found: images/all-badges.jpeg"
fi
echo

# Crop the badges
echo "🔪 Step 1: Cropping individual badges..."
node scripts/crop-badges.js

echo
echo "📋 Step 2: Next steps..."
echo "1. Get free Pinata IPFS API keys from: https://app.pinata.cloud/"
echo "2. Add these to your .env file:"
echo "   PINATA_API_KEY=your_api_key_here"
echo "   PINATA_SECRET_KEY=your_secret_key_here"
echo "3. Run: node scripts/ipfs-integration.js upload"
echo "4. Run: node scripts/ipfs-integration.js calls"
echo "5. Deploy your smart contract with the generated calls"
echo
echo "🎉 Then you'll have beautiful NFT certificates with custom badges!"
