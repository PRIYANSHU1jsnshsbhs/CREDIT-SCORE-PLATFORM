const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const OnChainScoreNFT = require('./nftService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9000;
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const ALLOWED_CHAINS = new Set(['eth', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism']);

let badgeMapping = {};
try {
  const ipfsMapPath = path.join(__dirname, 'images', 'badges', 'badge-mapping-ipfs.json');
  const localMapPath = path.join(__dirname, 'images', 'badges', 'badge-mapping.json');
  if (fs.existsSync(ipfsMapPath)) {
    badgeMapping = JSON.parse(fs.readFileSync(ipfsMapPath, 'utf-8'));
  } else if (fs.existsSync(localMapPath)) {
    badgeMapping = JSON.parse(fs.readFileSync(localMapPath, 'utf-8'));
  }
  console.log('✅ Badge mapping loaded successfully');
} catch (e) {
  console.warn('⚠️ Failed to load badge mapping, proceeding without images:', e.message);
  badgeMapping = {};
}

let nftService = null;
function initNFTService() {
  if (nftService) return nftService;
  try {
    nftService = new OnChainScoreNFT();
    return nftService;
  } catch (e) {
    console.error('❌ Failed to initialize NFT service:', e.message);
    return null;
  }
}

const MORALIS_KEYS = (process.env.MORALIS_API_KEYS || process.env.MORALIS_API_KEY || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
let moralisKeyIndex = 0;
function currentMoralisKey() {
  return MORALIS_KEYS[moralisKeyIndex] || '';
}
function rotateMoralisKey() {
  if (MORALIS_KEYS.length > 1) {
    moralisKeyIndex = (moralisKeyIndex + 1) % MORALIS_KEYS.length;
  }
}
function moralisHeaders() {
  return { accept: 'application/json', 'X-API-Key': currentMoralisKey() };
}
async function moralisGet(url) {
  const maxRetries = Number(process.env.MORALIS_RETRIES || 3);
  let attempt = 0;
  let lastErr;
  while (attempt <= maxRetries) {
    try {
      return await axios.get(url, { headers: moralisHeaders(), timeout: 15000 });
    } catch (e) {
      const s = e.response?.status;
      if (s === 401) {
        rotateMoralisKey();
        lastErr = e;
        attempt++;
        continue;
      }
      if (s === 429 || (s >= 500 && s < 600)) {
        const backoff = Math.min(2000, 300 * Math.pow(2, attempt));
        rotateMoralisKey();
        await new Promise((r) => setTimeout(r, backoff));
        lastErr = e;
        attempt++;
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('Moralis request failed after retries');
}

app.get('/api/resolve-ens', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'ENS name is required as ?name=' });
    }
    if (!name.toLowerCase().endsWith('.eth')) {
      return res.status(400).json({ error: 'Not an ENS .eth name', input: name });
    }
    const url = `https://deep-index.moralis.io/api/v2.2/resolve/ens/${encodeURIComponent(name)}`;
    try {
      const r = await moralisGet(url);
      const address = r.data?.address || r.data?.result?.address;
      if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.json({ success: true, name, address });
      }
      return res.status(404).json({ error: 'Unable to resolve ENS domain', input: name });
    } catch (e) {
      const status = e.response?.status;
      if (status === 404) {
        return res.status(404).json({ error: 'ENS domain not found', input: name });
      }
      console.error('ENS resolve error:', status, e.message);
      return res.status(502).json({ error: 'ENS resolution service error', status });
    }
  } catch (err) {
    console.error('ENS resolve unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 600) * 1000;
const cache = new Map();
function makeCacheKey(wallet, chains) {
  return `calc:${String(wallet).toLowerCase()}|${chains.join(',')}`;
}
function getCache(key) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  if (entry) cache.delete(key);
  return null;
}
function setCache(key, value, ttlMs = CACHE_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

app.post('/api/calculate-onchain-score', async (req, res) => {
  let { walletAddress, chains = ['eth', 'polygon', 'bsc', 'avalanche'] } = req.body || {};
  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'walletAddress is required' });
  }

  if (Array.isArray(chains)) {
    chains = chains.map((c) => String(c).toLowerCase()).filter((c) => ALLOWED_CHAINS.has(c));
  }
  if (!chains || chains.length === 0) chains = ['eth'];

  try {
    const originalInput = walletAddress.trim();
    const isHexAddr = /^0x[a-fA-F0-9]{40}$/.test(originalInput);
    if (!isHexAddr) {
      try {
        console.log(`🔍 Attempting ENS resolution for: ${originalInput}`);

        const ensResolveUrl = `https://deep-index.moralis.io/api/v2.2/resolve/ens/${encodeURIComponent(originalInput)}`;
        console.log(`📡 ENS URL: ${ensResolveUrl}`);

        const r = await moralisGet(ensResolveUrl);
        console.log(`📋 ENS response status: ${r.status}, data:`, r.data);

        const resolved = r.data?.address || r.data?.result?.address;
        if (resolved && /^0x[a-fA-F0-9]{40}$/.test(resolved)) {
          walletAddress = resolved;
          console.log(`✅ ENS resolved ${originalInput} -> ${walletAddress}`);
        } else {
          console.warn(`❌ ENS resolution failed: no valid address found in response`, r.data);
          return res.status(400).json({
            error: 'Could not resolve ENS domain to address',
            input: originalInput,
            details: 'ENS domain may not exist or may not be properly configured'
          });
        }
      } catch (e) {
        console.error('❌ ENS resolution error:', e.response?.status, e.response?.data || e.message);
        return res.status(400).json({
          error: 'ENS resolution failed',
          input: originalInput,
          details: e.response?.status === 404 ? 'ENS domain not found' : 'ENS resolution service error'
        });
      }
    }

    console.log(`🔍 Calculating REAL score for wallet: ${walletAddress}${isHexAddr ? '' : ` (from ENS ${originalInput})`}`);

    const key = makeCacheKey(walletAddress, chains);
    const cached = getCache(key);
    if (cached) {
      return res.json({ ...cached, timestamp: new Date().toISOString(), cached: true });
    }

    const scoreBreakdown = {
      totalScore: 0,
      components: {
        portfolioScore: 0, // 25
        activityScore: 0, // 20
        defiScore: 0, // 20
        diversificationScore: 0, // 15
        securityScore: 0, // 10
        identityScore: 0, // 5
        profitabilityScore: 0 // 5 (reserved)
      },
      details: {}
    };

    try {
      const chainQuery = chains.map((chain) => `chains%5B%5D=${chain}`).join('&');
      const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/net-worth?${chainQuery}&exclude_spam=true&exclude_unverified_contracts=true`;
      const r = await moralisGet(url);
      const netWorth = parseFloat(r.data?.total_networth_usd || 0);
      scoreBreakdown.details.netWorth = netWorth;
      if (netWorth >= 1_000_000) scoreBreakdown.components.portfolioScore = Math.min(25, 20 + Math.floor(netWorth / 2_000_000));
      else if (netWorth >= 100_000) scoreBreakdown.components.portfolioScore = Math.min(20, 15 + Math.floor(netWorth / 200_000));
      else if (netWorth >= 10_000) scoreBreakdown.components.portfolioScore = Math.min(15, 10 + Math.floor(netWorth / 20_000));
      else if (netWorth >= 1_000) scoreBreakdown.components.portfolioScore = Math.min(10, 5 + Math.floor(netWorth / 2_000));
      else if (netWorth >= 100) scoreBreakdown.components.portfolioScore = Math.min(5, 1 + Math.floor(netWorth / 50));
      else if (netWorth >= 10) scoreBreakdown.components.portfolioScore = 1;
    } catch (e) {
      const s = e.response?.status;
      if (s === 401 || s === 429) throw e;
      console.error('❌ Portfolio error:', e.message);
    }

    try {
      const chainsParam = chains.map((c, i) => `chains%5B${i}%5D=${c}`).join('&');
      const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/chains?${chainsParam}`;
      const r = await moralisGet(url);
      const activeChains = r.data?.active_chains?.length || 0;
      scoreBreakdown.details.activeChains = activeChains;
      if (activeChains >= 7) scoreBreakdown.components.activityScore += Math.min(10, 8 + activeChains - 7);
      else if (activeChains >= 5) scoreBreakdown.components.activityScore += Math.min(8, 6 + activeChains - 5);
      else if (activeChains >= 3) scoreBreakdown.components.activityScore += Math.min(6, 4 + activeChains - 3);
      else if (activeChains >= 2) scoreBreakdown.components.activityScore += Math.min(4, 2 + activeChains - 2);
      else if (activeChains >= 1) scoreBreakdown.components.activityScore += 2;

      let totalTx = 0;
      let earliest = null;
      let hasValidFirstTx = false;

      for (const ch of chains.slice(0, 4)) {
        try {
          const statsUrl = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/stats?chain=${ch}`;
          const stats = await moralisGet(statsUrl);
          const txCount = parseInt(stats.data?.count_of_transactions || 0);
          totalTx += isNaN(txCount) ? 0 : txCount;

          console.log(`📈 ${ch} stats response:`, JSON.stringify({
            count_of_transactions: stats.data?.count_of_transactions,
            first_transaction: stats.data?.first_transaction?.block_timestamp
          }, null, 2));

          const firstTs = stats.data?.first_transaction?.block_timestamp;
          if (firstTs) {
            const t = new Date(firstTs).getTime();
            if (!isNaN(t) && t > 0) {
              hasValidFirstTx = true;
              earliest = earliest === null ? t : Math.min(earliest, t);
            }
          }
        } catch (e) {
          const s = e.response?.status;
          if (s === 401 || s === 429) throw e;
          console.warn(`Stats error for ${ch}:`, e.message);
        }
      }

      let walletAgeMonths = 0;
      if (hasValidFirstTx && earliest !== null) {
        walletAgeMonths = Math.floor((Date.now() - earliest) / (1000 * 60 * 60 * 24 * 30));
        walletAgeMonths = Math.max(0, walletAgeMonths); // Ensure non-negative
      }

      scoreBreakdown.details.transactionCount = totalTx;
      scoreBreakdown.details.walletAgeMonths = walletAgeMonths;

      console.log(`📊 Stats aggregated: ${totalTx} tx, ${walletAgeMonths} months old, hasValidFirstTx: ${hasValidFirstTx}`);

      if (totalTx >= 1000) scoreBreakdown.components.activityScore += Math.min(5, 3 + Math.floor(totalTx / 500));
      else if (totalTx >= 500) scoreBreakdown.components.activityScore += Math.min(4, 2 + Math.floor(totalTx / 250));
      else if (totalTx >= 100) scoreBreakdown.components.activityScore += Math.min(3, 1 + Math.floor(totalTx / 50));
      else if (totalTx >= 50) scoreBreakdown.components.activityScore += Math.min(2, 1 + Math.floor(totalTx / 25));
      else if (totalTx >= 10) scoreBreakdown.components.activityScore += 1;
      if (walletAgeMonths >= 36) scoreBreakdown.components.activityScore += 5;
      else if (walletAgeMonths >= 24) scoreBreakdown.components.activityScore += 4;
      else if (walletAgeMonths >= 12) scoreBreakdown.components.activityScore += 3;
      else if (walletAgeMonths >= 6) scoreBreakdown.components.activityScore += 2;
      else if (walletAgeMonths >= 3) scoreBreakdown.components.activityScore += 1;
    } catch (e) {
      const s = e.response?.status;
      if (s === 401 || s === 429) throw e;
      console.error('❌ Activity error:', e.message);
    }

    let totalDefiPositions = 0;
    const defiProtocols = new Set();
    for (const chain of chains) {
      try {
        const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/defi/positions?chain=${chain}`;
        const r = await moralisGet(url);
        const positions = r.data?.result || [];
        totalDefiPositions += positions.length;
        positions.forEach((p) => {
          if (p.protocol_name) defiProtocols.add(p.protocol_name);
        });
      } catch (e) {
        const s = e.response?.status;
        if (s === 401 || s === 429) throw e;
        console.error(`❌ DeFi error ${chain}:`, e.message);
      }
    }
    scoreBreakdown.details.defiPositions = totalDefiPositions;
    scoreBreakdown.details.defiProtocols = Array.from(defiProtocols);
    if (defiProtocols.size >= 10) scoreBreakdown.components.defiScore += 10;
    else if (defiProtocols.size >= 7) scoreBreakdown.components.defiScore += 8;
    else if (defiProtocols.size >= 5) scoreBreakdown.components.defiScore += 6;
    else if (defiProtocols.size >= 3) scoreBreakdown.components.defiScore += 4;
    else if (defiProtocols.size >= 1) scoreBreakdown.components.defiScore += 2;
    if (totalDefiPositions >= 20) scoreBreakdown.components.defiScore += 10;
    else if (totalDefiPositions >= 10) scoreBreakdown.components.defiScore += 8;
    else if (totalDefiPositions >= 5) scoreBreakdown.components.defiScore += 6;
    else if (totalDefiPositions >= 3) scoreBreakdown.components.defiScore += 4;
    else if (totalDefiPositions >= 1) scoreBreakdown.components.defiScore += 2;

    let totalTokens = 0,
      totalNFTs = 0;
    const tokenTypes = new Set();
    for (const chain of chains.slice(0, 3)) {
      try {
        const tokenUrl = `https://deep-index.moralis.io/api/v2.2/${walletAddress}/erc20?chain=${chain}&exclude_spam=true&limit=100`;
        const tr = await moralisGet(tokenUrl);
        const tokens = tr.data || [];
        totalTokens += tokens.length;
        tokens.forEach((t) => tokenTypes.add(t.symbol));

        const nftUrl = `https://deep-index.moralis.io/api/v2.2/${walletAddress}/nft?chain=${chain}&format=decimal&exclude_spam=true&limit=50`;
        const nr = await moralisGet(nftUrl);
        const nfts = nr.data?.result || [];
        totalNFTs += nfts.length;
      } catch (e) {
        const s = e.response?.status;
        if (s === 401 || s === 429) throw e;
        console.error(`❌ Diversity error ${chain}:`, e.message);
      }
    }
    scoreBreakdown.details.totalTokens = totalTokens;
    scoreBreakdown.details.uniqueTokens = tokenTypes.size;
    scoreBreakdown.details.totalNFTs = totalNFTs;
    if (tokenTypes.size >= 20) scoreBreakdown.components.diversificationScore += 8;
    else if (tokenTypes.size >= 15) scoreBreakdown.components.diversificationScore += 6;
    else if (tokenTypes.size >= 10) scoreBreakdown.components.diversificationScore += 4;
    else if (tokenTypes.size >= 5) scoreBreakdown.components.diversificationScore += 3;
    else if (tokenTypes.size >= 2) scoreBreakdown.components.diversificationScore += 2;
    if (totalNFTs >= 50) scoreBreakdown.components.diversificationScore += 7;
    else if (totalNFTs >= 20) scoreBreakdown.components.diversificationScore += 5;
    else if (totalNFTs >= 10) scoreBreakdown.components.diversificationScore += 3;
    else if (totalNFTs >= 5) scoreBreakdown.components.diversificationScore += 2;
    else if (totalNFTs >= 1) scoreBreakdown.components.diversificationScore += 1;

    if (scoreBreakdown.components.defiScore === 0) {
      try {
        const symbols = Array.from(tokenTypes);
        const fallbackProtocols = new Set();
        const tests = [
          { name: 'Aave', rx: /^(AAVE|a[A-Z]{2,}|stkAAVE)$/i },
          { name: 'Compound', rx: /^c[A-Z]{2,}/ },
          { name: 'Uniswap', rx: /(UNI\-V2|UNIv2|UNI|V3)/i },
          { name: 'Curve', rx: /(CRV|3CRV|cvx)/i },
          { name: 'Sushi', rx: /SUSHI/i },
          { name: 'Balancer', rx: /(BPT|BAL)/i },
          { name: 'Lido', rx: /(stETH|wstETH)/i },
          { name: 'Yearn', rx: /^yv/i },
          { name: 'Pancake', rx: /(CAKE|Cake\-LP)/i },
          { name: 'GMX', rx: /GMX/i },
          { name: 'Stargate', rx: /STG/i }
        ];
        for (const s of symbols) {
          for (const t of tests) {
            if (t.rx.test(String(s))) fallbackProtocols.add(t.name);
          }
        }
        if (fallbackProtocols.size > 0) {
          const merged = new Set([...(scoreBreakdown.details.defiProtocols || []), ...fallbackProtocols]);
          scoreBreakdown.details.defiProtocols = Array.from(merged);
          const approx = fallbackProtocols.size;
          scoreBreakdown.details.defiPositions = Math.max(scoreBreakdown.details.defiPositions || 0, approx);

          let ds = 0;
          const prot = fallbackProtocols.size;
          if (prot >= 10) ds += 10;
          else if (prot >= 7) ds += 8;
          else if (prot >= 5) ds += 6;
          else if (prot >= 3) ds += 4;
          else if (prot >= 1) ds += 2;
          const pos = scoreBreakdown.details.defiPositions;
          if (pos >= 20) ds += 10;
          else if (pos >= 10) ds += 8;
          else if (pos >= 5) ds += 6;
          else if (pos >= 3) ds += 4;
          else if (pos >= 1) ds += 2;
          scoreBreakdown.components.defiScore = Math.max(scoreBreakdown.components.defiScore, ds);
        }
      } catch (_) {
      }
    }

    try {
      const ensReverseUrl = `https://deep-index.moralis.io/api/v2.2/resolve/${walletAddress}/reverse`;
      try {
        const ens = await moralisGet(ensReverseUrl);
        const ensName = ens.data?.name || ens.data?.domain || ens.data?.result?.name;
        if (ensName) {
          scoreBreakdown.components.identityScore += 3;
          scoreBreakdown.details.ensName = ensName;
        }
      } catch (_) {
      }

      if (scoreBreakdown.details.walletAgeMonths === 0 && scoreBreakdown.details.transactionCount === 0) {
        try {
          const statsUrl2 = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/stats?chain=eth`;
          const stats2 = await moralisGet(statsUrl2);
          const tx2 = parseInt(stats2.data?.count_of_transactions || 0);
          const firstTxTs2 = stats2.data?.first_transaction?.block_timestamp;

          if (tx2 > 0) scoreBreakdown.details.transactionCount = tx2;

          if (firstTxTs2) {
            const firstTime = new Date(firstTxTs2).getTime();
            if (!isNaN(firstTime) && firstTime > 0) {
              const age2 = Math.floor((Date.now() - firstTime) / (1000 * 60 * 60 * 24 * 30));
              if (age2 >= 0) scoreBreakdown.details.walletAgeMonths = age2;
            }
          }
        } catch (e) {
          console.warn('Stats fallback failed:', e.response?.status || e.message);
        }

        if (scoreBreakdown.details.transactionCount === 0 && scoreBreakdown.details.totalTokens > 0) {
          const tokens = scoreBreakdown.details.totalTokens || 0;
          if (tokens >= 500) {
            scoreBreakdown.details.transactionCount = Math.floor(tokens * 0.8); // Conservative estimate
            scoreBreakdown.details.walletAgeMonths = 24; // Assume 2+ years for large portfolios
          } else if (tokens >= 100) {
            scoreBreakdown.details.transactionCount = Math.floor(tokens * 0.6);
            scoreBreakdown.details.walletAgeMonths = 12; // Assume 1+ year
          } else if (tokens >= 20) {
            scoreBreakdown.details.transactionCount = Math.floor(tokens * 0.4);
            scoreBreakdown.details.walletAgeMonths = 6; // Assume 6+ months
          }
          console.log(`🔄 Using token-based heuristic: ${scoreBreakdown.details.transactionCount} est. tx, ${scoreBreakdown.details.walletAgeMonths} est. months`);
        }
      }

      const age = scoreBreakdown.details.walletAgeMonths || 0;
      if (age >= 48) scoreBreakdown.components.securityScore += 10;
      else if (age >= 36) scoreBreakdown.components.securityScore += 8;
      else if (age >= 24) scoreBreakdown.components.securityScore += 6;
      else if (age >= 12) scoreBreakdown.components.securityScore += 4;
      else if (age >= 6) scoreBreakdown.components.securityScore += 2;

      const tx = scoreBreakdown.details.transactionCount || 0;
      if (tx >= 500) scoreBreakdown.components.securityScore += 5;
      else if (tx >= 100) scoreBreakdown.components.securityScore += 3;
      else if (tx >= 50) scoreBreakdown.components.securityScore += 2;
      else if (tx >= 10) scoreBreakdown.components.securityScore += 1;
    } catch (e) {
      const s = e.response?.status;
      if (s === 401 || s === 429) throw e;
      console.error('❌ Security/Identity error:', e.message);
    }

    try {
      const nw = Number(scoreBreakdown.details.netWorth || 0);
      const tx = Number(scoreBreakdown.details.transactionCount || 0);
      if (nw >= 100000 && tx >= 200) scoreBreakdown.components.profitabilityScore = 5;
      else if (nw >= 10000 && tx >= 100) scoreBreakdown.components.profitabilityScore = 3;
      else if (nw >= 1000 && tx >= 50) scoreBreakdown.components.profitabilityScore = 2;
      else if (nw >= 100 && tx >= 10) scoreBreakdown.components.profitabilityScore = 1;
    } catch (_) {
    }

    scoreBreakdown.totalScore = Object.values(scoreBreakdown.components).reduce((a, b) => a + b, 0);
    let tier = '';
    let tierLetter = '';
    if (scoreBreakdown.totalScore >= 90) {
      tier = 'S+ (Crypto Whale)';
      tierLetter = 'S+';
    } else if (scoreBreakdown.totalScore >= 80) {
      tier = 'S (DeFi Expert)';
      tierLetter = 'S';
    } else if (scoreBreakdown.totalScore >= 70) {
      tier = 'A+ (Advanced User)';
      tierLetter = 'A+';
    } else if (scoreBreakdown.totalScore >= 60) {
      tier = 'A (Experienced User)';
      tierLetter = 'A';
    } else if (scoreBreakdown.totalScore >= 50) {
      tier = 'B+ (Active User)';
      tierLetter = 'B+';
    } else if (scoreBreakdown.totalScore >= 40) {
      tier = 'B (Regular User)';
      tierLetter = 'B';
    } else if (scoreBreakdown.totalScore >= 30) {
      tier = 'C+ (Casual User)';
      tierLetter = 'C+';
    } else if (scoreBreakdown.totalScore >= 20) {
      tier = 'C (Beginner)';
      tierLetter = 'C';
    } else if (scoreBreakdown.totalScore >= 10) {
      tier = 'D (New User)';
      tierLetter = 'D';
    } else {
      tier = 'F (Inactive)';
      tierLetter = 'F';
    }

    const badgeUrl = badgeMapping[tierLetter]?.gateway_url || '';
    const badgeDescription = badgeMapping[tierLetter]?.description || tier;

    console.log(`✅ REAL score calculated: ${scoreBreakdown.totalScore}/100 - ${tier}`);
    console.log(
      `📊 Breakdown: Portfolio:${scoreBreakdown.components.portfolioScore} Activity:${scoreBreakdown.components.activityScore} DeFi:${scoreBreakdown.components.defiScore} Diversity:${scoreBreakdown.components.diversificationScore} Security:${scoreBreakdown.components.securityScore} Identity:${scoreBreakdown.components.identityScore}`
    );

    const response = {
      walletAddress,
      score: scoreBreakdown.totalScore,
      maxScore: 100,
      tier,
      tierLetter,
      badgeUrl,
      badgeDescription,
      breakdown: scoreBreakdown.components,
      details: scoreBreakdown.details,
      timestamp: new Date().toISOString(),
      nftMintable: true,
      contractAddress: '0xcfAF8F74F8FD150574C7797506db7F2DD6FbD5aA',
      fallbackMode: false
    };
    setCache(key, response);
    return res.json(response);
  } catch (error) {
    console.error('❌ Error with Moralis API, switching to strict fallback:', error.message);
    const zeroBreakdown = {
      portfolioScore: 0,
      activityScore: 0,
      defiScore: 0,
      diversificationScore: 0,
      securityScore: 0,
      identityScore: 0,
      profitabilityScore: 0
    };
    const zeroDetails = {
      netWorth: 0,
      activeChains: 0,
      transactionCount: 0,
      walletAgeMonths: 0,
      defiPositions: 0,
      defiProtocols: [],
      totalTokens: 0,
      uniqueTokens: 0,
      totalNFTs: 0
    };
    console.log('⚠️ Returning strict fallback (all zeros) to avoid misleading scores.');
    return res.json({
      walletAddress,
      score: 0,
      maxScore: 100,
      tier: 'F (Inactive)',
      tierLetter: 'F',
      badgeUrl: badgeMapping['F']?.gateway_url || '',
      badgeDescription: badgeMapping['F']?.description || 'Inactive',
      breakdown: zeroBreakdown,
      details: zeroDetails,
      timestamp: new Date().toISOString(),
      nftMintable: false,
      contractAddress: '0xcfAF8F74F8FD150574C7797506db7F2DD6FbD5aA',
      fallbackMode: true,
      fallbackReason: 'Third-party API unavailable or rate-limited (Moralis 401/429). Data suppressed to prevent misleading results.'
    });
  }
});

app.post('/api/mint-certificate', async (req, res) => {
  const { walletAddress, score, breakdown } = req.body || {};

  try {
    if (!walletAddress || score === undefined) {
      return res.status(400).json({
        error: 'walletAddress and score are required',
        success: false
      });
    }

    const nft = initNFTService();
    if (!nft) {
      console.error('❌ initNFTService returned null - NFT service not initialized.');
      return res.status(500).json({ success: false, error: 'NFT service not initialized' });
    }

    if (!nft.isValidAddress(walletAddress)) {
      console.error('❌ Invalid wallet address format:', walletAddress);
      return res.status(400).json({
        error: 'Invalid wallet address format',
        success: false
      });
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({
        error: 'Score must be between 0 and 100',
        success: false
      });
    }

    console.log(`🎨 Minting REAL NFT certificate for ${walletAddress} with score ${score}`);

    let mintResult;
    try {
      mintResult = await nft.mintCertificate(walletAddress, score, breakdown);
    } catch (e) {
      console.error('❌ nft.mintCertificate threw an exception:', e);
      return res.status(500).json({ success: false, error: 'NFT minting threw an exception: ' + (e && e.message ? e.message : String(e)) });
    }

    if (!mintResult) {
      console.error('❌ nft.mintCertificate returned null/undefined');
      return res.status(500).json({ success: false, error: 'NFT minting returned no result' });
    }

    if (mintResult.success) {
      try {
        const imageUrl = badgeMapping[mintResult.tier]?.gateway_url || null;
        res.json({
          ...mintResult,
          etherscanUrl: `https://sepolia.etherscan.io/tx/${mintResult.transactionHash}`,
          opensea: mintResult.tokenId != null ? `https://testnets.opensea.io/assets/sepolia/0xcfAF8F74F8FD150574C7797506db7F2DD6FbD5aA/${mintResult.tokenId}` : null,
          metamaskImport: {
            contractAddress: '0xcfAF8F74F8FD150574C7797506db7F2DD6FbD5aA',
            tokenId: mintResult.tokenId ?? null,
            chain: 'sepolia',
            imageUrl
          },
          message: `🎉 REAL Certificate minted successfully! Your ${mintResult.tier} tier badge has been issued on blockchain.`
        });
      } catch (e) {
        console.error('❌ Error while preparing mint response:', e);
        res.status(500).json({ success: false, error: 'Error preparing mint response: ' + (e && e.message ? e.message : String(e)) });
      }
    } else {
      console.error('❌ Minting failed, mintResult:', mintResult);
      res.status(500).json({ success: false, error: mintResult.error || 'Failed to mint certificate' });
    }
  } catch (error) {
    console.error('❌ Error minting certificate:', error);
    res.status(500).json({ success: false, error: 'Internal server error during minting: ' + error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    moralisConnected: MORALIS_KEYS.length > 0,
    moralisKeys: MORALIS_KEYS.length,
    activeKeyIndex: moralisKeyIndex,
    cacheSize: cache.size,
    cacheTtlSeconds: Math.floor(CACHE_TTL_MS / 1000),
    nftServiceReady: !!nftService
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'modern-react-nft.html'));
});

app.get('/nft.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'nft.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 REAL OnChain Score Server running on port ${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log('✅ Using REAL Moralis API for wallet analysis');
  console.log('🎨 Using your custom tier badge images');
  console.log('🔗 NFT Contract: 0xcfAF8F74F8FD150574C7797506db7F2DD6FbD5aA');
});
