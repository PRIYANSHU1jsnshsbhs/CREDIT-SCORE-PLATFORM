# Deployment Guide for OnChain Score NFT Platform

## 🚀 Production Deployment Steps

### Prerequisites
- Domain name (optional but recommended)
- Cloud hosting account (Railway, Vercel, or DigitalOcean)
- Mainnet ETH for smart contract deployment
- Production Moralis API keys

### 1. Smart Contract Deployment

#### Mainnet Deployment (Production)
```bash
# Update .env for mainnet
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
PRIVATE_KEY=your_mainnet_private_key

# Deploy contract
forge script script/DeployOnChainScore.s.sol --rpc-url $ETHEREUM_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify

# Update nftService.js with new contract address
```

#### Polygon Deployment (Lower Costs)
```bash
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your-key
forge script script/DeployOnChainScore.s.sol --rpc-url $POLYGON_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### 2. Backend Deployment

#### Option A: Railway (Recommended)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

#### Option B: DigitalOcean App Platform
1. Connect GitHub repository
2. Set environment variables
3. Auto-deploy from main branch

#### Option C: AWS EC2
```bash
# Launch Ubuntu instance
# Install Node.js and dependencies
# Configure PM2 for process management
pm2 start real-server.js --name "onchain-score-api"
```

### 3. Frontend Deployment

#### Vercel (Recommended)
```bash
cd react-frontend
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm run build
# Upload dist/ folder to netlify.com
```

### 4. Environment Configuration

#### Production .env
```bash
# API Keys
MORALIS_API_KEY=prod_key_here
MORALIS_API_KEYS=key1,key2,key3

# Blockchain
PRIVATE_KEY=production_private_key
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/key
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/key

# Security
NODE_ENV=production
PORT=443
CORS_ORIGIN=https://your-frontend-domain.com

# Caching
CACHE_TTL_SECONDS=3600
REDIS_URL=redis://your-redis-instance
```

### 5. Domain Setup

#### Custom Domain
```bash
# Point your domain to deployed services
# Frontend: your-domain.com → Vercel/Netlify
# API: api.your-domain.com → Railway/DigitalOcean
```

#### SSL Certificate
- Automatic with Vercel/Netlify/Railway
- Manual setup for custom servers

### 6. Monitoring & Analytics

#### Error Tracking
```bash
npm install @sentry/node
# Add Sentry configuration to real-server.js
```

#### Analytics
```bash
npm install @google-analytics/gtag
# Add GA4 tracking to React frontend
```

### 7. Performance Optimization

#### Backend Optimizations
```bash
# Add Redis caching
npm install redis
# Implement rate limiting
npm install express-rate-limit
# Add compression
npm install compression
```

#### Frontend Optimizations
```bash
# Code splitting already enabled with Vite
# Add service worker for caching
npm install workbox-vite-plugin
```

## 💰 Estimated Costs

### Free Tier (Demo)
- Vercel Frontend: Free
- Railway Backend: Free (750 hours/month)
- Sepolia Testnet: Free
- **Total: $0/month**

### Production Tier
- Vercel Pro: $20/month
- Railway Pro: $5-20/month
- Ethereum Gas: $50-200/deployment
- Domain: $10-15/year
- **Total: $35-55/month**

### Enterprise Tier
- AWS/GCP Infrastructure: $100-500/month
- Dedicated RPC nodes: $100-300/month
- Multiple blockchain deployments: $200-500
- **Total: $400-1300/month**

## 🛡️ Security Checklist

- [ ] Environment variables secured
- [ ] Private keys encrypted
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Input validation enabled
- [ ] Smart contract audited
- [ ] SSL certificates active
- [ ] Monitoring alerts set up

## 📊 Post-Deployment Tasks

1. **Test all functionality** on production
2. **Monitor error rates** and performance
3. **Set up automated backups**
4. **Configure CI/CD pipeline**
5. **Document API endpoints**
6. **Set up user analytics**
7. **Plan scaling strategy**

## 🚀 Go Live Checklist

- [ ] Smart contract deployed and verified
- [ ] Backend API deployed and accessible
- [ ] Frontend deployed with custom domain
- [ ] All environment variables configured
- [ ] Database/Redis configured (if used)
- [ ] Monitoring and alerts active
- [ ] Documentation updated
- [ ] Social media and marketing ready
