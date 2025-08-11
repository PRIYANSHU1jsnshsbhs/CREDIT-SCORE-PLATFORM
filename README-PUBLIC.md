# 🚀 OnChain Credit Score Platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://creditscoreplatform-qn0tgdgqe-priyanshu-bariks-projects.vercel.app)
[![API Status](https://img.shields.io/badge/API-Live-success)](https://creditscoreplatform-production.up.railway.app/health)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/PRIYANSHU1jsnshsbhs/CREDIT-SCORE-PLATFORM?style=social)](https://github.com/PRIYANSHU1jsnshsbhs/CREDIT-SCORE-PLATFORM/stargazers)

> **A comprehensive Web3 analytics platform that calculates credit scores for crypto wallets using AI-powered analysis across multiple blockchains.**

## 🌟 **Live Platform**

🔥 **Try it now:** [creditscoreplatform.vercel.app](https://creditscoreplatform-qn0tgdgqe-priyanshu-bariks-projects.vercel.app)

- **Frontend**: https://creditscoreplatform-qn0tgdgqe-priyanshu-bariks-projects.vercel.app
- **API**: https://creditscoreplatform-production.up.railway.app
- **Repository**: https://github.com/PRIYANSHU1jsnshsbhs/CREDIT-SCORE-PLATFORM

## ✨ **Features**

### 🎯 **Core Functionality**
- 🔗 **Multi-Chain Support**: Ethereum, Polygon, BSC, Avalanche, Arbitrum, Optimism
- 📊 **7-Component Scoring**: Portfolio, Activity, DeFi, Diversification, Security, Identity, Profitability  
- 🏅 **NFT Badge System**: 10 tier system (S+ to F) with custom artwork
- ⚡ **Real-time Analysis**: Live data from 19+ Moralis API endpoints
- 🏷️ **ENS Support**: Resolve Ethereum Name Service domains

### 🎨 **User Experience**
- 💎 **Glassmorphism Design**: Modern, responsive UI with stunning visual effects
- 📱 **Mobile Responsive**: Perfect experience on all devices
- 🌙 **Dark Theme**: Eye-friendly interface for crypto users
- ⚡ **Real-time Feedback**: Live scoring progress with detailed breakdowns

### 🔧 **Technical Features**
- 🔐 **Smart Contract Integration**: NFT minting on Sepolia testnet
- 🌐 **IPFS Storage**: Decentralized badge image hosting
- 🛡️ **Rate Limiting**: Built-in API protection and caching
- 🚨 **Error Handling**: Graceful fallbacks and user feedback

## 🛠 **Tech Stack**

### **Frontend**
- React 18 + TypeScript
- Vite (lightning-fast builds)
- Tailwind CSS (styling)
- Deployed on **Vercel**

### **Backend** 
- Node.js + Express
- Moralis Web3 API (19+ endpoints)
- Ethers.js (blockchain interactions)
- Deployed on **Railway**

### **Blockchain**
- Solidity 0.8.23 smart contracts
- OpenZeppelin security standards  
- Foundry development framework
- Multi-testnet deployments

## 📊 **Scoring Algorithm**

Our platform calculates credit scores (0-100) based on 7 key components:

| Component | Max Points | Description |
|-----------|------------|-------------|
| 📈 **Portfolio** | 20 | Total wallet value and asset diversity |
| 🔄 **Activity** | 15 | Transaction frequency and consistency |
| 🏦 **DeFi** | 20 | Decentralized finance protocol usage |
| 🌐 **Diversification** | 15 | Cross-chain and token variety |
| 🛡️ **Security** | 10 | Smart contract interaction safety |
| 🆔 **Identity** | 10 | ENS domains and verified credentials |
| 💰 **Profitability** | 10 | Trading performance and gains |

### **Tier System**
- 💎 **S+ (90-100)**: Legendary DeFi Master
- ⭐ **S (80-89)**: Elite Crypto Trader  
- 🥇 **A+ (70-79)**: Advanced User
- 🥈 **A (60-69)**: Experienced Trader
- 🥉 **B+ (50-59)**: Active User
- 📊 **B (40-49)**: Regular Trader
- 🔰 **C+ (30-39)**: Casual User
- 📖 **C (20-29)**: Beginner
- 🌱 **D (10-19)**: New User
- ❌ **F (0-9)**: Inactive

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- npm 8+
- Git

### **Installation**
```bash
# Clone the repository
git clone https://github.com/PRIYANSHU1jsnshsbhs/CREDIT-SCORE-PLATFORM.git
cd CREDIT-SCORE-PLATFORM

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Moralis API keys

# Start the backend
npm start

# In a new terminal, start the frontend
cd react-frontend
npm install
npm run dev
```

### **Environment Variables**
```env
# Required
MORALIS_API_KEYS=your_moralis_api_keys_here
PRIVATE_KEY=your_wallet_private_key

# Optional
NODE_ENV=development
PORT=9000
CACHE_TTL_SECONDS=600
```

## 🎨 **API Documentation**

### **Calculate Score**
```http
POST /api/calculate-onchain-score
Content-Type: application/json

{
  "walletAddress": "0x742CE2142032b9e2C43d3a9d7b06b80DC9620c4A",
  "chains": ["eth", "polygon", "bsc"]
}
```

**Response:**
```json
{
  "walletAddress": "0x742CE2142032b9e2C43d3a9d7b06b80DC9620c4A",
  "score": 65,
  "maxScore": 100,
  "tier": "A (Experienced Trader)",
  "tierLetter": "A",
  "breakdown": {
    "portfolioScore": 18,
    "activityScore": 12,
    "defiScore": 15,
    "diversificationScore": 10,
    "securityScore": 5,
    "identityScore": 3,
    "profitabilityScore": 2
  }
}
```

### **Resolve ENS**
```http
GET /api/resolve-ens?name=vitalik.eth
```

### **Health Check**
```http
GET /health
```

## 📈 **Live Demo**

Try these sample wallets to see the platform in action:

1. **vitalik.eth** - High-value DeFi user
2. **0x742CE2142032b9e2C43d3a9d7b06b80DC9620c4A** - Active trader
3. **0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045** - Multi-chain user

Visit: [creditscoreplatform.vercel.app](https://creditscoreplatform-qn0tgdgqe-priyanshu-bariks-projects.vercel.app)

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/CREDIT-SCORE-PLATFORM.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m 'Add amazing feature'

# Push to your fork and create a pull request
git push origin feature/amazing-feature
```

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 **Achievements**

- ✅ Multi-chain Web3 integration
- ✅ Production-ready smart contracts
- ✅ Modern React TypeScript architecture
- ✅ IPFS decentralized storage
- ✅ Real-time blockchain data analysis
- ✅ Professional UI/UX design

## 📞 **Contact & Support**

- **Developer**: Priyanshu Barik
- **GitHub**: [@PRIYANSHU1jsnshsbhs](https://github.com/PRIYANSHU1jsnshsbhs)
- **Project Issues**: [GitHub Issues](https://github.com/PRIYANSHU1jsnshsbhs/CREDIT-SCORE-PLATFORM/issues)

## ⭐ **Show Your Support**

If you found this project helpful, please consider:
- ⭐ Starring the repository
- 🍴 Forking for your own projects
- 📢 Sharing with the community
- 🐛 Reporting bugs or suggesting features

---

**Built with ❤️ for the Web3 community**
