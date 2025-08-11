import { useState } from 'react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://creditscoreplatform-production.up.railway.app';

interface WalletAnalysis {
  score: number;
  maxScore: number;
  tier: string;
  tierName: string;
  badgeImage: string;
  fallbackMode?: boolean;
  breakdown: {
    portfolioValue: number;
    activityScore: number;
    defiEngagement: number;
    diversification: number;
    security: number;
    identity: number;
    profitability: number;
  };
  details: {
    netWorth: number;
    activeChains: number;
    transactionCount: number;
    walletAgeMonths: number;
    defiPositions: number;
    defiProtocols: string[];
    totalTokens: number;
    uniqueTokens: number;
    totalNFTs: number;
  };
}

const WalletAnalyzer = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null);
  const [notification, setNotification] = useState('');
  const [minting, setMinting] = useState(false);
  const [selectedChains, setSelectedChains] = useState(['eth', 'polygon']);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [mintTarget, setMintTarget] = useState<string>('');
  const [mintInfo, setMintInfo] = useState<null | {
    transactionHash?: string;
    tokenId?: string | number | null;
    tokenURI?: string | null;
    etherscanUrl?: string;
    opensea?: string | null;
    metamaskImport?: { contractAddress: string; tokenId: string | number | null; chain?: string; imageUrl?: string | null } | null;
    message?: string;
  }>(null);

  const toGatewayUrl = (uri?: string | null) => {
    if (!uri) return '';
    if (uri.startsWith('ipfs://ipfs/')) return `https://ipfs.io/${uri.replace('ipfs://', '')}`;
    if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`;
    return uri; // already http(s)
  };

  const openImageFromTokenURI = async (tokenURI?: string | null) => {
    try {
      const metaUrl = toGatewayUrl(tokenURI || '');
      if (!metaUrl) {
        showNotification('❌ No tokenURI available');
        return;
      }
      const r = await fetch(metaUrl, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const meta = await r.json().catch(() => null);
      const raw = meta?.image || meta?.image_url || meta?.imageUrl;
      const imgUrl = toGatewayUrl(typeof raw === 'string' ? raw : '');
      if (imgUrl) {
        window.open(imgUrl, '_blank', 'noopener');
      } else {
        showNotification('ℹ️ Image URL not found in metadata');
      }
    } catch (e) {
      console.warn('Failed to open image from tokenURI:', e);
      showNotification('⚠️ Could not load image from IPFS');
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 5000);
  };

  const analyzeWallet = async () => {
    if (!walletAddress.trim()) {
      showNotification('❌ Please enter a wallet address');
      return;
    }

    if (selectedChains.length === 0) {
      showNotification('❌ Please select at least one chain');
      return;
    }

    setLoading(true);
    setLoadingProgress('🔍 Starting analysis...');

    try {
      setLoadingProgress(`⛓️ Analyzing ${selectedChains.join(', ').toUpperCase()} chains...`);
      let input = walletAddress.trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(input) && input.toLowerCase().endsWith('.eth')) {
        setLoadingProgress('🔎 Resolving ENS name...');
        try {
          const ensRes = await fetch(`${API_BASE_URL}/api/resolve-ens?name=${encodeURIComponent(input)}`);
          if (ensRes.ok) {
            const ens = await ensRes.json();
            input = ens.address;
            setLoadingProgress(`✅ ENS resolved to ${ens.address.slice(0, 6)}...${ens.address.slice(-4)}. Continuing analysis...`);
          } else {
            const err = await ensRes.json().catch(() => ({}));
            showNotification(`❌ ENS not found: ${err?.error || 'Invalid ENS name'}`);
            setLoading(false);
            return;
          }
        } catch (e) {
          showNotification('❌ ENS resolution failed. Please try a wallet address.');
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/calculate-onchain-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: input,
          chains: selectedChains
        })
      });

      if (response.ok) {
        setLoadingProgress('📊 Processing results...');
        const data = await response.json();
        setAnalysis({
          score: data.score || 0,
          maxScore: data.maxScore || 100,
          tier: data.tierLetter || 'F',
          tierName: data.tier || 'Beginner',
          badgeImage: data.badgeUrl || '',
          fallbackMode: data.fallbackMode,
          breakdown: {
            portfolioValue: data.breakdown?.portfolioScore || 0,
            activityScore: data.breakdown?.activityScore || 0,
            defiEngagement: data.breakdown?.defiScore || 0,
            diversification: data.breakdown?.diversificationScore || 0,
            security: data.breakdown?.securityScore || 0,
            identity: data.breakdown?.identityScore || 0,
            profitability: data.breakdown?.profitabilityScore || 0,
          },
          details: {
            netWorth: data.details?.netWorth || 0,
            activeChains: data.details?.activeChains || 0,
            transactionCount: data.details?.transactionCount || 0,
            walletAgeMonths: data.details?.walletAgeMonths || 0,
            defiPositions: data.details?.defiPositions || 0,
            defiProtocols: data.details?.defiProtocols || [],
            totalTokens: data.details?.totalTokens || 0,
            uniqueTokens: data.details?.uniqueTokens || 0,
            totalNFTs: data.details?.totalNFTs || 0
          }
        });
        try {
          const resolved = (data.walletAddress && /^0x[a-fA-F0-9]{40}$/.test(data.walletAddress)) ? data.walletAddress : input;
          setMintTarget(resolved);
        } catch (_) {
          setMintTarget(input);
        }
        showNotification('✅ Analysis completed successfully!');
      } else {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error ? `Analysis failed: ${err.error}` : 'Analysis failed';
        throw new Error(msg);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      const msg = error instanceof Error ? error.message : '❌ Analysis failed.';
      showNotification(msg);
    }
    setLoading(false);
  };

  const mintNFT = async () => {
    if (!analysis) return;

    if (!mintTarget || !/^0x[a-fA-F0-9]{40}$/.test(mintTarget)) {
      showNotification('❌ Invalid or missing wallet address for mint. Analyze a wallet first.');
      return;
    }

    setMinting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/mint-certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: mintTarget,
          score: analysis.score,
          tier: analysis.tier,
          breakdown: {
            portfolioScore: analysis.breakdown.portfolioValue,
            activityScore: analysis.breakdown.activityScore,
            defiScore: analysis.breakdown.defiEngagement,
            diversificationScore: analysis.breakdown.diversification,
            securityScore: analysis.breakdown.security,
            identityScore: analysis.breakdown.identity,
            profitabilityScore: analysis.breakdown.profitability
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMintInfo({ ...data });
        showNotification('✅ NFT Certificate minted successfully! 🎉');
        console.log('Minted NFT:', data);
      } else {
        throw new Error('Minting failed');
      }
    } catch (error) {
      console.error('Minting failed:', error);
      showNotification('❌ NFT minting failed. Please try again.');
    }
    setMinting(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-black/80 backdrop-blur-sm border border-blue-500/30 px-6 py-3 rounded-lg">
          <p className="text-sm font-medium text-white">{notification}</p>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center mb-12">
        <h2 className="text-6xl font-black mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
          Your Web3 Identity
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Analyze your wallet's OnChain activity, get a comprehensive credit score, and mint an NFT certificate to showcase your Web3 reputation.
        </p>
      </div>

      {/* Wallet Input Section */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 mb-8">
        <h3 className="text-2xl font-bold mb-6 text-center">Enter Wallet Address</h3>

        {/* Chain Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-4 text-center">Select Chains to Analyze:</label>
          <div className="flex gap-3 justify-center flex-wrap">
            {['eth', 'polygon', 'bsc', 'arbitrum'].map((chain) => (
              <button
                key={chain}
                onClick={() => {
                  if (selectedChains.includes(chain)) {
                    setSelectedChains(selectedChains.filter(c => c !== chain));
                  } else {
                    setSelectedChains([...selectedChains, chain]);
                  }
                }}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${selectedChains.includes(chain)
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-2 border-blue-400/50 shadow-lg shadow-blue-500/30'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 border-2 border-white/20 hover:border-white/40'
                  }`}
              >
                {chain.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="0x... or ENS domain"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="flex-1 px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={analyzeWallet}
            disabled={loading}
            className="group relative px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-white text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 border border-blue-400/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <span className="relative flex items-center justify-center space-x-3">
              <span className="text-2xl">{loading ? '⚡' : '🔍'}</span>
              <span>{loading ? 'Analyzing...' : 'Analyze Wallet'}</span>
            </span>
            {loading && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-30 animate-pulse"></div>
            )}
          </button>
        </div>

        {/* Sample Wallets */}
        <div className="space-y-4">
          <p className="text-center text-gray-400 text-sm">Try these sample wallets:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setWalletAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')}
              className="group relative px-6 py-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 rounded-xl text-sm text-gray-300 hover:text-white transition-all duration-300 border border-green-500/20 hover:border-green-400/40 transform hover:scale-102"
              title="High-activity DeFi wallet"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <span className="text-lg">🚀</span>
                  <span className="font-semibold">High Activity Wallet</span>
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Multi-chain DeFi user</div>
              </div>
            </button>
            <button
              onClick={() => setWalletAddress('0xB423D1a0436ECA8EC64A8C677361dDEA3d1bA855')}
              className="group relative px-6 py-4 bg-gradient-to-r from-orange-600/20 to-red-600/20 hover:from-orange-600/30 hover:to-red-600/30 rounded-xl text-sm text-gray-300 hover:text-white transition-all duration-300 border border-orange-500/20 hover:border-orange-400/40 transform hover:scale-102"
              title="Basic wallet example"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <span className="text-lg">📊</span>
                  <span className="font-semibold">Basic Wallet</span>
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Starter wallet example</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-300 mb-2">Analyzing blockchain data...</p>
          <p className="text-blue-400 text-sm">{loadingProgress}</p>
          <div className="mt-4 text-xs text-gray-500">
            Analyzing chains: {selectedChains.join(', ').toUpperCase()}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-8">
          {/* Score Overview */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-3xl p-8 text-center">
            <h3 className="text-3xl font-bold mb-4">OnChain Score</h3>
            {analysis.fallbackMode && (
              <div className="mb-4 text-amber-300 text-sm">
                Using fallback scoring due to API limits. Results are heuristic.
              </div>
            )}
            <div className="text-6xl font-black mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {analysis.score}/{analysis.maxScore}
            </div>
            <div className="text-2xl font-bold text-white mb-2">Tier {analysis.tier}</div>
            <div className="text-lg text-gray-300">{analysis.tierName}</div>

            {/* Mint NFT Button */}
            <div className="mt-8">
              <button
                onClick={mintNFT}
                disabled={minting || analysis.fallbackMode}
                className="group relative px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-white text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/30 border border-green-400/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <span className="relative flex items-center justify-center space-x-3">
                  <span className="text-2xl">{minting ? '⏳' : '🎨'}</span>
                  <span>{minting ? 'Minting NFT Certificate...' : (analysis.fallbackMode ? 'NFT Mint Disabled (Fallback Mode)' : 'Mint NFT Certificate')}</span>
                </span>
                {minting && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 opacity-30 animate-pulse"></div>
                )}
              </button>
            </div>

            {/* Centered Badge Display */}
            {analysis.badgeImage && (
              <div className="mt-8 mb-6 flex flex-col items-center">
                <div className="relative group">
                  {/* Animated Glow Ring */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full opacity-75 group-hover:opacity-100 blur-lg animate-pulse transition-all duration-500"></div>

                  {/* Badge Container */}
                  <div className="relative">
                    <img
                      src={analysis.badgeImage}
                      alt={`Tier ${analysis.tier} Badge`}
                      className="w-48 h-48 mx-auto rounded-full border-4 border-white/30 shadow-2xl transform group-hover:scale-105 transition-all duration-300 animate-fade-in"
                      style={{
                        filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.3))',
                        animation: 'badgeFloat 3s ease-in-out infinite'
                      }}
                    />

                    {/* Tier Label Overlay */}
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-sm font-bold text-white shadow-lg border border-white/20">
                      Tier {analysis.tier}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Post-mint Actions */}
            {mintInfo && (
              <div className="mt-8 space-y-6">
                {/* Transaction Info */}
                <div className="text-center space-y-3">
                  {mintInfo.transactionHash && (
                    <div className="flex items-center justify-center space-x-2 text-sm">
                      <span className="text-gray-400">Transaction:</span>
                      <a
                        className="text-blue-400 hover:text-blue-300 underline font-mono transition-colors"
                        href={mintInfo.etherscanUrl || `https://sepolia.etherscan.io/tx/${mintInfo.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {mintInfo.transactionHash.slice(0, 8)}...{mintInfo.transactionHash.slice(-6)}
                      </a>
                    </div>
                  )}
                  {mintInfo.opensea && (
                    <div className="flex items-center justify-center space-x-2 text-sm">
                      <span className="text-gray-400">NFT:</span>
                      <a
                        className="text-purple-400 hover:text-purple-300 underline transition-colors"
                        href={mintInfo.opensea}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on OpenSea (testnet)
                      </a>
                    </div>
                  )}
                </div>

                {/* IPFS Action Buttons */}
                {(mintInfo?.tokenURI || mintInfo?.metamaskImport?.imageUrl) && (
                  <div className="flex justify-center">
                    <div className="flex gap-4 items-center flex-wrap">
                      {mintInfo?.tokenURI && (
                        <a
                          href={toGatewayUrl(mintInfo.tokenURI)}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative px-6 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 hover:from-blue-600/40 hover:to-cyan-600/40 border border-blue-500/30 hover:border-blue-400/50 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                          <span className="relative flex items-center space-x-2">
                            <span className="text-xl">📄</span>
                            <span>View Metadata</span>
                          </span>
                        </a>
                      )}

                      {mintInfo?.tokenURI ? (
                        <button
                          onClick={() => openImageFromTokenURI(mintInfo.tokenURI)}
                          className="group relative px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/40 hover:to-pink-600/40 border border-purple-500/30 hover:border-purple-400/50 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                          <span className="relative flex items-center space-x-2">
                            <span className="text-xl">🖼️</span>
                            <span>View Image</span>
                          </span>
                        </button>
                      ) : mintInfo?.metamaskImport?.imageUrl && (
                        <a
                          href={mintInfo.metamaskImport.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative px-6 py-3 bg-gradient-to-r from-orange-600/20 to-red-600/20 hover:from-orange-600/40 hover:to-red-600/40 border border-orange-500/30 hover:border-orange-400/50 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                          <span className="relative flex items-center space-x-2">
                            <span className="text-xl">🏆</span>
                            <span>View Badge</span>
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Score Breakdown */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-6">Score Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(analysis.breakdown).map(([key, value]) => (
                <div key={key} className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-blue-400 font-bold">{value}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${Math.min((value / (key === 'portfolioValue' ? 25 : key === 'activityScore' ? 20 : key === 'defiEngagement' ? 20 : key === 'diversification' ? 15 : key === 'security' ? 10 : key === 'identity' ? 5 : key === 'profitability' ? 5 : 25)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wallet Details */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-6">Wallet Details</h3>

            {/* Chain Analysis Summary */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg">
              <h4 className="text-lg font-semibold mb-2">Analyzed Chains</h4>
              <div className="flex flex-wrap gap-2">
                {selectedChains.map((chain) => (
                  <span
                    key={chain}
                    className="px-3 py-1 bg-blue-600/30 text-blue-200 rounded-full text-sm font-medium"
                  >
                    {chain.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  ${analysis.details.netWorth.toLocaleString()}
                </div>
                <div className="text-gray-400">Net Worth</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {analysis.details.transactionCount}
                </div>
                <div className="text-gray-400">Total Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {analysis.details.activeChains}
                </div>
                <div className="text-gray-400">Active Chains</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {analysis.details.totalTokens}
                </div>
                <div className="text-gray-400">Total Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400 mb-2">
                  {analysis.details.totalNFTs}
                </div>
                <div className="text-gray-400">NFTs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-400 mb-2">
                  {analysis.details.walletAgeMonths}
                </div>
                <div className="text-gray-400">Months Old</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletAnalyzer;