const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class SmartContractIntegration {
  constructor() {
    this.contracts = {};
    this.providers = {};
    this.signers = {};

    this.initializeProviders();
    this.loadContractABIs();
  }

  initializeProviders() {
    this.providers.ethereum = new ethers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-key'
    );

    this.providers.polygon = new ethers.JsonRpcProvider(
      process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/your-key'
    );

    this.providers.bsc = new ethers.JsonRpcProvider(
      process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org'
    );

    this.providers.avalanche = new ethers.JsonRpcProvider(
      process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc'
    );

    this.providers.mumbai = new ethers.JsonRpcProvider(
      process.env.MUMBAI_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/your-key'
    );

    this.providers.sepolia = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/your-key'
    );

    if (process.env.PRIVATE_KEY) {
      Object.keys(this.providers).forEach(network => {
        this.signers[network] = new ethers.Wallet(
          process.env.PRIVATE_KEY,
          this.providers[network]
        );
      });
    }
  }

  loadContractABIs() {
    try {
      const onChainScoreABI = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../abis/OnChainScore.json'), 'utf8')
      );

      const contractAddresses = {
        ethereum: process.env.ONCHAIN_SCORE_CONTRACT_ETHEREUM,
        polygon: process.env.ONCHAIN_SCORE_CONTRACT_POLYGON,
        bsc: process.env.ONCHAIN_SCORE_CONTRACT_BSC,
        avalanche: process.env.ONCHAIN_SCORE_CONTRACT_AVALANCHE
      };

      Object.keys(contractAddresses).forEach(chain => {
        if (contractAddresses[chain] && this.providers[chain]) {
          this.contracts[chain] = new ethers.Contract(
            contractAddresses[chain],
            onChainScoreABI,
            this.signers[chain] || this.providers[chain]
          );
        }
      });
    } catch (error) {
      console.log('Contract ABI loading skipped:', error.message);
    }
  }

  /**
   * Update score on smart contract
   */
  async updateScoreOnChain(walletAddress, scoreData, chain = 'polygon') {
    try {
      if (!this.contracts[chain]) {
        throw new Error(`Contract not deployed on ${chain}`);
      }

      const contract = this.contracts[chain];
      const componentScores = [
        scoreData.breakdown.portfolioScore,
        scoreData.breakdown.activityScore,
        scoreData.breakdown.defiScore,
        scoreData.breakdown.diversificationScore,
        scoreData.breakdown.securityScore,
        scoreData.breakdown.identityScore,
        scoreData.breakdown.profitabilityScore
      ];

      const gasEstimate = await contract.estimateGas.updateScore(
        walletAddress,
        scoreData.score,
        componentScores,
        scoreData.tier
      );

      const tx = await contract.updateScore(
        walletAddress,
        scoreData.score,
        componentScores,
        scoreData.tier,
        {
          gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
        }
      );

      console.log(`Score update transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Score updated on-chain for ${walletAddress} on ${chain}`);

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.error('Error updating score on-chain:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Read score from smart contract
   */
  async getScoreFromChain(walletAddress, chain = 'polygon') {
    try {
      if (!this.contracts[chain]) {
        throw new Error(`Contract not deployed on ${chain}`);
      }

      const contract = this.contracts[chain];
      const scoreData = await contract.getWalletScore(walletAddress);

      return {
        totalScore: Number(scoreData.totalScore),
        portfolioScore: Number(scoreData.portfolioScore),
        activityScore: Number(scoreData.activityScore),
        defiScore: Number(scoreData.defiScore),
        diversificationScore: Number(scoreData.diversificationScore),
        securityScore: Number(scoreData.securityScore),
        identityScore: Number(scoreData.identityScore),
        profitabilityScore: Number(scoreData.profitabilityScore),
        timestamp: Number(scoreData.timestamp),
        tier: scoreData.tier,
        isValid: scoreData.isValid
      };

    } catch (error) {
      console.error('Error reading score from chain:', error);
      return null;
    }
  }

  /**
   * Get wallet badges from smart contract
   */
  async getWalletBadges(walletAddress, chain = 'polygon') {
    try {
      if (!this.contracts[chain]) {
        return [];
      }

      const contract = this.contracts[chain];
      const badges = await contract.getWalletBadges(walletAddress);

      const badgeDetails = await Promise.all(
        badges.map(async (badgeId) => {
          const badge = await contract.badges(badgeId);
          return {
            id: Number(badgeId),
            name: badge.name,
            description: badge.description,
            imageURI: badge.imageURI
          };
        })
      );

      return badgeDetails;

    } catch (error) {
      console.error('Error getting badges:', error);
      return [];
    }
  }

  /**
   * Deploy new contracts
   */
  async deployContracts(chain = 'polygon') {
    try {
      if (!this.signers[chain]) {
        throw new Error('Signer not available for deployment');
      }

      const contractABI = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../abis/OnChainScore.json'), 'utf8')
      );

      const contractBytecode = fs.readFileSync(
        path.join(__dirname, '../bytecode/OnChainScore.bin'), 'utf8'
      );

      const contractFactory = new ethers.ContractFactory(
        contractABI,
        contractBytecode,
        this.signers[chain]
      );

      console.log(`Deploying OnChainScore contract to ${chain}...`);
      const contract = await contractFactory.deploy();
      await contract.deployed();

      console.log(`Contract deployed to ${chain} at:`, contract.address);

      return {
        success: true,
        contractAddress: contract.address,
        transactionHash: contract.deployTransaction.hash
      };

    } catch (error) {
      console.error('Deployment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Interact with DeFi protocols
   */
  async analyzeDeFiPositions(walletAddress, chain = 'ethereum') {
    try {
      const provider = this.providers[chain];

      const protocols = {
        ethereum: {
          uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
          aave: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
          compound: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
          maker: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2'
        },
        polygon: {
          quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
          aave: '0xd05e3E715d945B59290df0ae8eF85c1BdB684744',
          curve: '0x445FE580eF8d70FF569aB36e80c647af338db351'
        }
      };

      const results = {
        totalPositions: 0,
        protocols: [],
        totalValue: 0
      };

      for (const [protocolName, address] of Object.entries(protocols[chain] || {})) {
        try {
          const balance = await provider.getBalance(walletAddress);

          if (balance.gt(0)) {
            results.protocols.push({
              name: protocolName,
              address: address,
              hasPosition: true
            });
            results.totalPositions++;
          }
        } catch (error) {
          console.log(`Error analyzing ${protocolName}:`, error.message);
        }
      }

      return results;

    } catch (error) {
      console.error('DeFi analysis error:', error);
      return { totalPositions: 0, protocols: [], totalValue: 0 };
    }
  }

  /**
   * Get gas prices for different chains
   */
  async getGasPrices() {
    const gasPrices = {};

    for (const [chain, provider] of Object.entries(this.providers)) {
      try {
        const gasPrice = await provider.getGasPrice();
        gasPrices[chain] = {
          gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
          gasPriceWei: gasPrice.toString()
        };
      } catch (error) {
        console.log(`Error getting gas price for ${chain}:`, error.message);
      }
    }

    return gasPrices;
  }

  /**
   * Validate smart contract interactions
   */
  async validateContractInteraction(contractAddress, chain) {
    try {
      const provider = this.providers[chain];
      const code = await provider.getCode(contractAddress);

      return {
        isContract: code !== '0x',
        codeSize: code.length,
        chain: chain
      };

    } catch (error) {
      return {
        isContract: false,
        error: error.message
      };
    }
  }

  /**
   * Get wallet's certificate token ID
   */
  async getWalletCertificate(walletAddress, chain = 'polygon') {
    try {
      const contract = this.getContract(chain);
      if (!contract) {
        throw new Error(`No contract found for chain: ${chain}`);
      }

      const tokenId = await contract.getWalletCertificate(walletAddress);
      return Number(tokenId);
    } catch (error) {
      console.error('Error getting wallet certificate:', error);
      return 0;
    }
  }

  /**
   * Check if wallet has certificate
   */
  async hasCertificate(walletAddress, chain = 'polygon') {
    try {
      const contract = this.getContract(chain);
      if (!contract) {
        throw new Error(`No contract found for chain: ${chain}`);
      }

      return await contract.hasCertificate(walletAddress);
    } catch (error) {
      console.error('Error checking certificate:', error);
      return false;
    }
  }

  /**
   * Get certificate metadata from token URI
   */
  async getCertificateMetadata(tokenId, chain = 'polygon') {
    try {
      const contract = this.getContract(chain);
      if (!contract) {
        throw new Error(`No contract found for chain: ${chain}`);
      }

      const tokenURI = await contract.tokenURI(tokenId);

      if (tokenURI.startsWith('data:application/json;base64,')) {
        const base64Data = tokenURI.replace('data:application/json;base64,', '');
        const jsonString = Buffer.from(base64Data, 'base64').toString();
        const metadata = JSON.parse(jsonString);

        const scoreData = {};
        if (metadata.attributes) {
          metadata.attributes.forEach(attr => {
            switch (attr.trait_type) {
              case 'Total Score':
                scoreData.totalScore = attr.value;
                break;
              case 'Tier':
                scoreData.tier = attr.value;
                break;
              case 'Portfolio Score':
                scoreData.portfolioScore = attr.value;
                break;
              case 'DeFi Score':
                scoreData.defiScore = attr.value;
                break;
            }
          });
        }

        return {
          ...metadata,
          ...scoreData
        };
      }

      return { tokenURI };
    } catch (error) {
      console.error('Error getting certificate metadata:', error);
      throw error;
    }
  }

  /**
   * Set base certificate image (owner only)
   */
  async setBaseCertificateImage(imageHash, chain = 'polygon') {
    try {
      const contract = this.getContractWithSigner(chain);
      if (!contract) {
        throw new Error(`No contract found for chain: ${chain}`);
      }

      const tx = await contract.setBaseCertificateImage(imageHash);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: Number(receipt.gasUsed)
      };
    } catch (error) {
      console.error('Error setting certificate image:', error);
      throw error;
    }
  }

  /**
   * Set tier-specific badge image (owner only)
   */
  async setTierImage(tier, imageHash, chain = 'polygon') {
    try {
      const contract = this.getContractWithSigner(chain);
      if (!contract) {
        throw new Error(`No contract found for chain: ${chain}`);
      }

      const tx = await contract.setTierImage(tier, imageHash);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: Number(receipt.gasUsed)
      };
    } catch (error) {
      console.error('Error setting tier image:', error);
      throw error;
    }
  }

  /**
   * Set multiple tier images at once (owner only)
   */
  async setTierImages(tiers, imageHashes, chain = 'polygon') {
    try {
      const contract = this.getContractWithSigner(chain);
      if (!contract) {
        throw new Error(`No contract found for chain: ${chain}`);
      }

      const tx = await contract.setTierImages(tiers, imageHashes);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: Number(receipt.gasUsed)
      };
    } catch (error) {
      console.error('Error setting tier images:', error);
      throw error;
    }
  }

  /**
   * Get tier image hash
   */
  async getTierImage(tier, chain = 'polygon') {
    try {
      const contract = this.getContract(chain);
      if (!contract) {
        throw new Error(`No contract found for chain: ${chain}`);
      }

      return await contract.getTierImage(tier);
    } catch (error) {
      console.error('Error getting tier image:', error);
      throw error;
    }
  }
}

module.exports = SmartContractIntegration;
