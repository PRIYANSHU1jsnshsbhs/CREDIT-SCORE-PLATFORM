# 🎖️ Badge Integration Setup Guide

## 📋 Overview
This guide will help you integrate your custom badge images into the NFT certificate system.

## 🚀 Quick Start

### Step 1: Save Your Badge Image
1. Save the badge image you provided as: `images/all-badges.png`
2. Make sure it's the exact image with the 4x3 grid layout

### Step 2: Crop Individual Badges
```bash
# Using Node.js (recommended)
node scripts/crop-badges.js

# OR using Python
python3 scripts/crop-badges.py
```

This will create individual badge files in `images/badges/` folder:
- `S+_crypto_whale.png`
- `S_defi_expert.png`
- `A+_advanced_user.png`
- etc.

### Step 3: Upload to IPFS
1. Get free Pinata API keys from: https://app.pinata.cloud/
2. Add to your `.env` file:
```bash
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_secret_key_here
```

3. Upload all badges:
```bash
node scripts/ipfs-integration.js upload
```

### Step 4: Update Smart Contract
```bash
# Generate the contract calls
node scripts/ipfs-integration.js calls

# Then deploy your contract and run those calls
```

## 🎯 What This Does

### Certificate Generation Flow:
1. **User analyzes wallet** → Gets onchain score (0-100)
2. **System determines tier** → Based on score ranges
3. **NFT Certificate created** → With tier-specific badge image
4. **Dynamic metadata** → Includes all score details
5. **Shareable result** → OpenSea + social media ready

### Badge Tier System:
| Score Range | Tier | Badge Style |
|-------------|------|-------------|
| 90-100 | S+ (Crypto Whale) | Premium gold design |
| 80-89 | S (DeFi Expert) | Orange premium |
| 70-79 | A+ (Advanced User) | Dark blue elegant |
| 60-69 | A (Experienced User) | Red/pink professional |
| 50-59 | B+ (Active User) | Green badge style |
| 40-49 | B (Regular User) | Blue circular |
| 30-39 | C+ (Casual User) | Orange hexagonal |
| 20-29 | C (Beginner) | Red decorative |
| 10-19 | D (New User) | Orange sunburst |
| 0-9 | F (Inactive) | Dark minimalist |

## 🛠️ Technical Details

### Smart Contract Updates:
- Added `tierImages` mapping for tier-specific badge images
- `setTierImage()` function to set individual tier images
- `setTierImages()` function for batch updates
- Enhanced `tokenURI()` to use tier-specific images

### Backend Integration:
- Badge cropping automation
- IPFS upload workflow
- Metadata generation
- Smart contract integration helpers

### NFT Metadata Structure:
```json
{
  "name": "OnChain Credit Score Certificate #123",
  "description": "Official OnChain Credit Score Certificate...",
  "image": "ipfs://QmYourTierSpecificBadgeHash",
  "attributes": [
    {"trait_type": "Total Score", "value": 85},
    {"trait_type": "Tier", "value": "S"},
    {"trait_type": "Portfolio Score", "value": 22},
    {"trait_type": "DeFi Score", "value": 18}
  ]
}
```

## 🔧 Environment Setup

Add to your `.env` file:
```bash
# IPFS Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Optional: Use alternative IPFS providers
# INFURA_IPFS_PROJECT_ID=your_project_id
# INFURA_IPFS_SECRET=your_secret
```

## 🎉 Ready to Use!

Once setup is complete:
1. Deploy your enhanced smart contract
2. Set the tier images using the generated calls
3. Users can generate NFT certificates with their custom badge designs
4. Certificates automatically use the appropriate tier badge
5. Share on social media with beautiful, branded certificates!

## 📞 Support

If you encounter any issues:
1. Check that your image is saved correctly as `images/all-badges.png`
2. Ensure IPFS API keys are valid
3. Verify smart contract deployment
4. Test with a sample wallet analysis

Your NFT certificate system is now ready with custom badge integration! 🎖️
