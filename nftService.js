const { ethers } = require('ethers');
require('dotenv').config();

const CONTRACT_ADDRESS = '0xcfAF8F74F8FD150574C7797506db7F2DD6FbD5aA';
let SEPOLIA_RPC_CANDIDATES = [
  'https://1rpc.io/sepolia',
  'https://rpc.sepolia.org',
  'https://sepolia.drpc.org',
  process.env.SEPOLIA_RPC_URL,
  process.env.ALCHEMY_SEPOLIA_RPC_URL,
  process.env.INFURA_SEPOLIA_RPC_URL
].filter(Boolean);

SEPOLIA_RPC_CANDIDATES = [
  ...SEPOLIA_RPC_CANDIDATES.filter((u) => !/alchemy\.com\/public/i.test(String(u))),
  ...SEPOLIA_RPC_CANDIDATES.filter((u) => /alchemy\.com\/public/i.test(String(u)))
];

const CONTRACT_ABI = require('./abis/OnChainScore.json');

class OnChainScoreNFT {
  constructor() {
    let provider = null;
    let selectedUrl = null;

    for (const url of SEPOLIA_RPC_CANDIDATES) {
      try {
        console.log(`🔗 Trying RPC provider: ${url}`);
        provider = new ethers.JsonRpcProvider(url);
        selectedUrl = url;
        console.log(`✅ Connected to RPC: ${url}`);
        break;
      } catch (e) {
        console.warn(`❌ RPC failed: ${url} - ${e.message}`);
        continue;
      }
    }

    if (!provider || !selectedUrl) {
      throw new Error('No working Sepolia RPC URL available');
    }
    this.provider = provider;

    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }

    privateKey = privateKey.trim();
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }

    if (privateKey.length !== 66) {
      throw new Error('Private key must be 64 characters (32 bytes) plus 0x prefix');
    }

    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);

    console.log(`✅ NFT Service initialized with wallet: ${this.wallet.address}`);
    console.log(`Connected using RPC: ${selectedUrl}`);
  }

  getTierFromScore(score) {
    if (score >= 90) return 'S+';
    if (score >= 80) return 'S';
    if (score >= 70) return 'A+';
    if (score >= 60) return 'A';
    if (score >= 50) return 'B+';
    if (score >= 40) return 'B';
    if (score >= 30) return 'C+';
    if (score >= 20) return 'C';
    if (score >= 10) return 'D';
    return 'F';
  }

  async mintCertificate(walletAddress, score, componentBreakdown) {
    try {
      const tier = this.getTierFromScore(score);

      console.log(`Minting certificate for ${walletAddress}:`);
      console.log(`Score: ${score}, Tier: ${tier}`);

      const components = [
        BigInt(componentBreakdown?.portfolioScore ?? 0),
        BigInt(componentBreakdown?.activityScore ?? 0),
        BigInt(componentBreakdown?.defiScore ?? 0),
        BigInt(componentBreakdown?.diversificationScore ?? 0),
        BigInt(componentBreakdown?.securityScore ?? 0),
        BigInt(componentBreakdown?.identityScore ?? 0),
        BigInt(componentBreakdown?.profitabilityScore ?? 0)
      ];

      let gasLimit;
      try {
        const gasEstimate = await this.contract.updateScore.estimateGas(
          walletAddress,
          BigInt(score),
          components,
          tier
        );
        gasLimit = (gasEstimate * 120n) / 100n;
      } catch (e) {
        console.warn('Gas estimate failed, using fallback gas limit:', e?.message || e);
        gasLimit = 350000n;
      }

      const tx = await this.contract.updateScore(
        walletAddress,
        BigInt(score),
        components,
        tier,
        { gasLimit }
      );

      console.log(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();

      let tokenId = null;
      try {
        const iface = new ethers.Interface(CONTRACT_ABI);
        for (const log of receipt.logs || []) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === 'Transfer') {
              const from = String(parsed.args.from).toLowerCase();
              const to = String(parsed.args.to).toLowerCase();
              if (from === '0x0000000000000000000000000000000000000000' && to === walletAddress.toLowerCase()) {
                tokenId = parsed.args.tokenId?.toString?.() ?? null;
                break;
              }
            }
          } catch (_) {
          }
        }
      } catch (e) {
        console.warn('Could not parse tokenId from receipt logs:', e.message);
      }

      if (tokenId == null) {
        try {
          const certId = await this.contract.getWalletCertificate(walletAddress);
          if (certId != null) {
            const n = BigInt(certId).toString();
            const owner = await this.contract.ownerOf(n);
            if (String(owner).toLowerCase() === walletAddress.toLowerCase()) {
              tokenId = n;
            }
          }
        } catch (_) {
        }
      }

      let tokenURI = null;
      if (tokenId != null) {
        try {
          tokenURI = await this.contract.tokenURI(tokenId);
        } catch (_) {
        }
      }

      return {
        success: true,
        transactionHash: tx.hash,
        tokenId: tokenId,
        tokenURI,
        tier: tier,
        score: score,
        recipient: walletAddress,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      console.error('Error minting certificate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getTokenMetadata(tokenId) {
    try {
      const tokenURI = await this.contract.tokenURI(tokenId);
      const owner = await this.contract.ownerOf(tokenId);

      return {
        tokenId: tokenId,
        owner: owner,
        tokenURI: tokenURI
      };
    } catch (error) {
      console.error('Error getting token metadata:', error);
      return null;
    }
  }

  async getWalletNFTCount(walletAddress) {
    try {
      const balance = await this.contract.balanceOf(walletAddress);
      return Number(balance);
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  }

  async getTotalSupply() {
    try {
      const supply = await this.contract.totalSupply();
      return Number(supply);
    } catch (error) {
      console.error('Error getting total supply:', error);
      return 0;
    }
  }

  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  formatAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}

module.exports = OnChainScoreNFT;
