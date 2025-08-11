const axios = require('axios');

class PolygonEnhancedIntegration {
  constructor() {
    this.polygonRPC = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.polygonScanAPI = process.env.POLYGONSCAN_API_KEY;
    this.quickSwapAPI = 'https://api.thegraph.com/subgraphs/name/sameepsi/quickswap06';
    this.aavePolygonAPI = 'https://api.thegraph.com/subgraphs/name/aave/aave-v2-matic';
  }

  /**
   * Enhanced Polygon-specific scoring
   */
  async calculatePolygonScore(walletAddress) {
    try {
      const polygonData = await Promise.all([
        this.getPolygonNativeBalance(walletAddress),
        this.getPolygonTokenBalances(walletAddress),
        this.getPolygonDeFiPositions(walletAddress),
        this.getPolygonNFTs(walletAddress),
        this.getPolygonTransactionHistory(walletAddress),
        this.getPolygonStakingData(walletAddress),
        this.getPolygonBridgeActivity(walletAddress)
      ]);

      const [
        nativeBalance,
        tokenBalances,
        defiPositions,
        nfts,
        transactions,
        stakingData,
        bridgeActivity
      ] = polygonData;

      const polygonScore = {
        nativeAssets: this.calculateNativeAssetsScore(nativeBalance, tokenBalances),
        defiEngagement: this.calculatePolygonDeFiScore(defiPositions),
        nftActivity: this.calculateNFTScore(nfts),
        transactionActivity: this.calculateTransactionScore(transactions),
        stakingRewards: this.calculateStakingScore(stakingData),
        crossChainActivity: this.calculateBridgeScore(bridgeActivity),
        gasEfficiency: this.calculateGasEfficiencyScore(transactions)
      };

      const bonuses = {
        earlyAdopter: this.calculateEarlyAdopterBonus(transactions),
        ecosystemParticipation: this.calculateEcosystemBonus(defiPositions),
        gasOptimization: this.calculateGasOptimizationBonus(transactions)
      };

      return {
        polygonScore,
        bonuses,
        totalPolygonScore: this.calculateTotalPolygonScore(polygonScore, bonuses),
        breakdown: {
          nativeBalance: parseFloat(nativeBalance.balance) || 0,
          tokenCount: tokenBalances.length || 0,
          defiProtocols: defiPositions.protocols?.length || 0,
          nftCollections: nfts.collections?.length || 0,
          transactionCount: transactions.length || 0,
          stakingAmount: stakingData.totalStaked || 0,
          bridgeTransactions: bridgeActivity.length || 0
        }
      };

    } catch (error) {
      console.error('Error calculating Polygon score:', error);
      return this.getDefaultPolygonScore();
    }
  }

  /**
   * Get Polygon native MATIC balance
   */
  async getPolygonNativeBalance(walletAddress) {
    try {
      const response = await axios.post(this.polygonRPC, {
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [walletAddress, 'latest'],
        id: 1
      });

      const balanceWei = response.data.result;
      const balanceMatic = parseInt(balanceWei, 16) / 1e18;

      return {
        balance: balanceMatic.toFixed(4),
        balanceWei: balanceWei,
        currency: 'MATIC'
      };

    } catch (error) {
      console.error('Error getting Polygon balance:', error);
      return { balance: '0', balanceWei: '0x0', currency: 'MATIC' };
    }
  }

  /**
   * Get Polygon token balances (enhanced)
   */
  async getPolygonTokenBalances(walletAddress) {
    try {
      const popularTokens = [
        { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
        { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
        { symbol: 'WETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
        { symbol: 'WBTC', address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', decimals: 8 },
        { symbol: 'DAI', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 },
        { symbol: 'AAVE', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18 },
        { symbol: 'QUICK', address: '0x831753DD7087CaC61aB5644b308642cc1c33Dc13', decimals: 18 },
        { symbol: 'SUSHI', address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', decimals: 18 }
      ];

      const balances = [];

      for (const token of popularTokens) {
        try {
          const balance = await this.getTokenBalance(walletAddress, token.address, token.decimals);
          if (parseFloat(balance.balance) > 0) {
            balances.push({
              ...token,
              balance: balance.balance,
              balanceWei: balance.balanceWei
            });
          }
        } catch (error) {
          console.log(`Error getting balance for ${token.symbol}:`, error.message);
        }
      }

      return balances;

    } catch (error) {
      console.error('Error getting Polygon token balances:', error);
      return [];
    }
  }

  /**
   * Get token balance for specific contract
   */
  async getTokenBalance(walletAddress, contractAddress, decimals) {
    try {
      const data = `0x70a08231000000000000000000000000${walletAddress.slice(2)}`;

      const response = await axios.post(this.polygonRPC, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: data
        }, 'latest'],
        id: 1
      });

      const balanceWei = response.data.result;
      const balance = parseInt(balanceWei, 16) / Math.pow(10, decimals);

      return {
        balance: balance.toFixed(6),
        balanceWei: balanceWei
      };

    } catch (error) {
      return { balance: '0', balanceWei: '0x0' };
    }
  }

  /**
   * Get Polygon DeFi positions
   */
  async getPolygonDeFiPositions(walletAddress) {
    try {
      const protocols = [];

      const quickswapPositions = await this.getQuickSwapPositions(walletAddress);
      if (quickswapPositions.length > 0) {
        protocols.push({
          name: 'QuickSwap',
          type: 'DEX',
          positions: quickswapPositions.length,
          tvl: quickswapPositions.reduce((sum, pos) => sum + (pos.value || 0), 0)
        });
      }

      const aavePositions = await this.getAavePolygonPositions(walletAddress);
      if (aavePositions.length > 0) {
        protocols.push({
          name: 'Aave',
          type: 'Lending',
          positions: aavePositions.length,
          tvl: aavePositions.reduce((sum, pos) => sum + (pos.value || 0), 0)
        });
      }

      const sushiPositions = await this.getSushiPolygonPositions(walletAddress);
      if (sushiPositions.length > 0) {
        protocols.push({
          name: 'SushiSwap',
          type: 'DEX',
          positions: sushiPositions.length,
          tvl: sushiPositions.reduce((sum, pos) => sum + (pos.value || 0), 0)
        });
      }

      return {
        protocols,
        totalProtocols: protocols.length,
        totalTVL: protocols.reduce((sum, protocol) => sum + protocol.tvl, 0)
      };

    } catch (error) {
      console.error('Error getting Polygon DeFi positions:', error);
      return { protocols: [], totalProtocols: 0, totalTVL: 0 };
    }
  }

  /**
   * Get QuickSwap positions using The Graph
   */
  async getQuickSwapPositions(walletAddress) {
    try {
      const query = `
                query GetUserPositions($user: String!) {
                    liquidityPositions(where: { user: $user }) {
                        id
                        liquidityTokenBalance
                        pair {
                            id
                            token0 { symbol }
                            token1 { symbol }
                            reserveUSD
                        }
                    }
                }
            `;

      const response = await axios.post(this.quickSwapAPI, {
        query,
        variables: { user: walletAddress.toLowerCase() }
      });

      return response.data.data.liquidityPositions || [];

    } catch (error) {
      console.error('Error getting QuickSwap positions:', error);
      return [];
    }
  }

  /**
   * Get Aave Polygon positions
   */
  async getAavePolygonPositions(walletAddress) {
    try {
      const query = `
                query GetUserReserves($user: String!) {
                    userReserves(where: { user: $user }) {
                        id
                        currentATokenBalance
                        currentStableDebt
                        currentVariableDebt
                        reserve {
                            symbol
                            priceInUsd: price { priceInEth }
                        }
                    }
                }
            `;

      const response = await axios.post(this.aavePolygonAPI, {
        query,
        variables: { user: walletAddress.toLowerCase() }
      });

      return response.data.data.userReserves || [];

    } catch (error) {
      console.error('Error getting Aave positions:', error);
      return [];
    }
  }

  /**
   * Get SushiSwap Polygon positions
   */
  async getSushiPolygonPositions(walletAddress) {
    try {
      const sushiPolygonAPI = 'https://api.thegraph.com/subgraphs/name/sushi-labs/sushi-polygon';

      const query = `
                query GetUserPositions($user: String!) {
                    liquidityPositions(where: { user: $user }) {
                        id
                        liquidityTokenBalance
                        pair {
                            id
                            token0 { symbol }
                            token1 { symbol }
                            reserveUSD
                        }
                    }
                }
            `;

      const response = await axios.post(sushiPolygonAPI, {
        query,
        variables: { user: walletAddress.toLowerCase() }
      });

      return response.data.data.liquidityPositions || [];

    } catch (error) {
      console.error('Error getting SushiSwap positions:', error);
      return [];
    }
  }

  /**
   * Get Polygon staking data
   */
  async getPolygonStakingData(walletAddress) {
    try {
      const stakingData = {
        totalStaked: 0,
        validators: [],
        rewards: 0
      };

      return stakingData;

    } catch (error) {
      console.error('Error getting staking data:', error);
      return { totalStaked: 0, validators: [], rewards: 0 };
    }
  }

  /**
   * Get bridge activity (Polygon PoS Bridge)
   */
  async getPolygonBridgeActivity(walletAddress) {
    try {
      return [];

    } catch (error) {
      console.error('Error getting bridge activity:', error);
      return [];
    }
  }

  /**
   * Calculate various Polygon-specific scores
   */
  calculateNativeAssetsScore(nativeBalance, tokenBalances) {
    const maticBalance = parseFloat(nativeBalance.balance) || 0;
    const tokenCount = tokenBalances.length;

    let score = Math.min(maticBalance * 2, 10); // Max 10 points for MATIC
    score += Math.min(tokenCount, 5); // Max 5 points for token diversity

    return Math.min(score, 15);
  }

  calculatePolygonDeFiScore(defiPositions) {
    const protocolCount = defiPositions.totalProtocols || 0;
    const tvl = defiPositions.totalTVL || 0;

    let score = protocolCount * 3; // 3 points per protocol
    score += Math.min(tvl / 1000, 10); // TVL bonus

    return Math.min(score, 25);
  }

  calculateGasEfficiencyScore(transactions) {
    const txCount = transactions.length || 0;
    if (txCount > 50) return 5; // Frequent user bonus
    if (txCount > 20) return 3;
    if (txCount > 5) return 1;
    return 0;
  }

  calculateEarlyAdopterBonus(transactions) {
    const earlyDate = new Date('2021-06-01');
    const hasEarlyTx = transactions.some(tx =>
      new Date(tx.timestamp * 1000) < earlyDate
    );
    return hasEarlyTx ? 5 : 0;
  }

  calculateEcosystemBonus(defiPositions) {
    const protocolCount = defiPositions.totalProtocols || 0;
    if (protocolCount >= 3) return 3;
    if (protocolCount >= 2) return 2;
    if (protocolCount >= 1) return 1;
    return 0;
  }

  calculateGasOptimizationBonus(transactions) {
    return 2; // Polygon users automatically get this bonus
  }

  calculateTotalPolygonScore(polygonScore, bonuses) {
    const baseScore = Object.values(polygonScore).reduce((sum, score) => sum + score, 0);
    const bonusScore = Object.values(bonuses).reduce((sum, bonus) => sum + bonus, 0);
    return Math.min(baseScore + bonusScore, 100);
  }

  getDefaultPolygonScore() {
    return {
      polygonScore: {
        nativeAssets: 0,
        defiEngagement: 0,
        nftActivity: 0,
        transactionActivity: 0,
        stakingRewards: 0,
        crossChainActivity: 0,
        gasEfficiency: 0
      },
      bonuses: {
        earlyAdopter: 0,
        ecosystemParticipation: 0,
        gasOptimization: 0
      },
      totalPolygonScore: 0,
      breakdown: {
        nativeBalance: 0,
        tokenCount: 0,
        defiProtocols: 0,
        nftCollections: 0,
        transactionCount: 0,
        stakingAmount: 0,
        bridgeTransactions: 0
      }
    };
  }

  calculateNFTScore(nfts) {
    const collectionCount = nfts.collections?.length || 0;
    return Math.min(collectionCount * 2, 10);
  }

  calculateTransactionScore(transactions) {
    const txCount = transactions.length || 0;
    if (txCount > 1000) return 15;
    if (txCount > 500) return 12;
    if (txCount > 100) return 8;
    if (txCount > 50) return 5;
    if (txCount > 10) return 2;
    return 0;
  }

  calculateStakingScore(stakingData) {
    const staked = stakingData.totalStaked || 0;
    return Math.min(staked / 1000, 10);
  }

  calculateBridgeScore(bridgeActivity) {
    const bridgeCount = bridgeActivity.length || 0;
    return Math.min(bridgeCount * 2, 8);
  }
}

module.exports = PolygonEnhancedIntegration;
