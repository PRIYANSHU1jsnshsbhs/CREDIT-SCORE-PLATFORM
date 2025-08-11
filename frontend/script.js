class OnChainScoreApp {
  constructor() {
    this.walletConnected = false;
    this.currentAccount = null;
    this.provider = null;
    this.init();
  }

  init() {
    this.initializeElements();
    this.bindEvents();
    this.initializeLucide();
    this.checkWalletConnection();
  }

  initializeElements() {
    this.elements = {
      connectWalletBtn: document.getElementById('connectWallet'),
      walletInput: document.getElementById('walletInput'),
      analyzeBtn: document.getElementById('analyzeBtn'),
      loadingState: document.getElementById('loadingState'),
      resultsSection: document.getElementById('resultsSection'),
      walletAddress: document.getElementById('walletAddress'),
      scoreTier: document.getElementById('scoreTier'),
      scoreValue: document.getElementById('scoreValue'),
      scoreRing: document.getElementById('scoreRing'),
      breakdownGrid: document.getElementById('breakdownGrid'),
      statsGrid: document.getElementById('statsGrid'),
      overviewGrid: document.getElementById('overviewGrid'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      tabPanels: document.querySelectorAll('.tab-panel'),
      generateCertificateBtn: document.getElementById('generateCertificate'),
      certificateResult: document.getElementById('certificateResult')
    };
  }

  bindEvents() {
    this.elements.connectWalletBtn.addEventListener('click', () => this.connectWallet());
    this.elements.analyzeBtn.addEventListener('click', () => this.analyzeWallet());
    this.elements.walletInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.analyzeWallet();
      }
    });

    if (this.elements.generateCertificateBtn) {
      this.elements.generateCertificateBtn.addEventListener('click', () => this.generateCertificate());
    }

    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
  }

  initializeLucide() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  async checkWalletConnection() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.walletConnected = true;
          this.currentAccount = accounts[0];
          this.updateWalletUI();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  }

  async connectWallet() {
    if (typeof window.ethereum === 'undefined') {
      this.showNotification('MetaMask not detected. Please install MetaMask.', 'error');
      return;
    }

    try {
      this.elements.connectWalletBtn.innerHTML = `
                <div style="width: 18px; height: 18px; border: 2px solid transparent; border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                Connecting...
            `;

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.walletConnected = true;
      this.currentAccount = accounts[0];
      this.provider = new ethers.providers.Web3Provider(window.ethereum);

      this.updateWalletUI();
      this.showNotification('Wallet connected successfully!', 'success');

      this.elements.walletInput.value = this.currentAccount;

    } catch (error) {
      console.error('Error connecting wallet:', error);
      this.showNotification('Failed to connect wallet', 'error');
      this.elements.connectWalletBtn.innerHTML = `
                <i data-lucide="wallet" class="btn-icon"></i>
                Connect Wallet
            `;
      this.initializeLucide();
    }
  }

  updateWalletUI() {
    if (this.walletConnected && this.currentAccount) {
      const shortAddress = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
      this.elements.connectWalletBtn.innerHTML = `
                <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 4px;"></div>
                ${shortAddress}
            `;
      this.elements.connectWalletBtn.style.background = 'rgba(16, 185, 129, 0.1)';
      this.elements.connectWalletBtn.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      this.elements.connectWalletBtn.style.color = '#10b981';
    }
  }

  getSelectedChains() {
    const checkboxes = document.querySelectorAll('.chain-option input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }

  async resolveENS(input) {
    if (input.endsWith('.eth')) {
      try {
        const response = await fetch('/api/resolve-ens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: input })
        });
        const data = await response.json();
        return data.address;
      } catch (error) {
        console.error('ENS resolution failed:', error);
        return null;
      }
    }
    return input;
  }

  async analyzeWallet() {
    const walletInput = this.elements.walletInput.value.trim();
    if (!walletInput) {
      this.showNotification('Please enter a wallet address or ENS domain', 'error');
      return;
    }

    const selectedChains = this.getSelectedChains();
    if (selectedChains.length === 0) {
      this.showNotification('Please select at least one blockchain', 'error');
      return;
    }

    const walletAddress = await this.resolveENS(walletInput);
    if (!walletAddress) {
      this.showNotification('Failed to resolve ENS domain', 'error');
      return;
    }

    if (!this.isValidAddress(walletAddress)) {
      this.showNotification('Invalid wallet address format', 'error');
      return;
    }

    this.showLoading();

    try {
      const response = await fetch('/api/calculate-onchain-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddress,
          chains: selectedChains
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const scoreData = await response.json();
      this.displayResults(scoreData);

    } catch (error) {
      console.error('Error analyzing wallet:', error);
      this.showNotification('Failed to analyze wallet. Please try again.', 'error');
      this.hideLoading();
    }
  }

  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  showLoading() {
    this.elements.loadingState.classList.remove('hidden');
    this.elements.resultsSection.classList.add('hidden');
    this.elements.analyzeBtn.disabled = true;
    this.elements.analyzeBtn.innerHTML = `
            <div style="width: 18px; height: 18px; border: 2px solid transparent; border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            Analyzing...
        `;
  }

  hideLoading() {
    this.elements.loadingState.classList.add('hidden');
    this.elements.analyzeBtn.disabled = false;
    this.elements.analyzeBtn.innerHTML = `
            <i data-lucide="zap" class="btn-icon"></i>
            Analyze Wallet
        `;
    this.initializeLucide();
  }

  displayResults(data) {
    this.hideLoading();
    this.elements.resultsSection.classList.remove('hidden');
    this.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    this.currentWalletData = data;

    this.updateScoreDisplay(data);
    this.updateScoreBreakdown(data.breakdown);
    this.updateStatsGrid(data.details);
    this.updateOverviewGrid(data);

    this.elements.resultsSection.classList.add('fade-in-up');
  }

  updateScoreDisplay(data) {
    this.elements.walletAddress.textContent = this.formatAddress(data.walletAddress);

    this.elements.scoreTier.textContent = data.tier;
    this.elements.scoreTier.className = `score-tier tier-${this.getTierClass(data.score)}`;

    this.elements.scoreValue.textContent = data.score;

    this.animateScoreRing(data.score);
  }

  formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  getTierClass(score) {
    if (score >= 90) return 's-plus';
    if (score >= 80) return 's';
    if (score >= 70) return 'a-plus';
    if (score >= 60) return 'a';
    if (score >= 50) return 'b-plus';
    if (score >= 40) return 'b';
    if (score >= 30) return 'c-plus';
    if (score >= 20) return 'c';
    if (score >= 10) return 'd';
    return 'f';
  }

  animateScoreRing(score) {
    const circumference = 2 * Math.PI * 50; // radius = 50
    const offset = circumference - (score / 100) * circumference;

    if (!document.querySelector('#scoreGradient')) {
      const svg = this.elements.scoreRing.parentElement;
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', 'scoreGradient');
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '100%');
      gradient.setAttribute('y2', '0%');

      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', '#6366f1');

      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', '#8b5cf6');

      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
      svg.appendChild(defs);
    }

    this.elements.scoreRing.style.strokeDashoffset = offset;
  }

  updateScoreBreakdown(breakdown) {
    const components = [
      { key: 'portfolioScore', label: 'Portfolio', max: 25, icon: 'wallet' },
      { key: 'activityScore', label: 'Activity', max: 20, icon: 'activity' },
      { key: 'defiScore', label: 'DeFi', max: 20, icon: 'trending-up' },
      { key: 'diversificationScore', label: 'Diversification', max: 15, icon: 'pie-chart' },
      { key: 'securityScore', label: 'Security', max: 10, icon: 'shield' },
      { key: 'identityScore', label: 'Identity', max: 5, icon: 'user' },
      { key: 'profitabilityScore', label: 'Profitability', max: 5, icon: 'dollar-sign' }
    ];

    this.elements.breakdownGrid.innerHTML = components.map(component => `
            <div class="breakdown-item">
                <div class="breakdown-info">
                    <div class="breakdown-label">
                        <i data-lucide="${component.icon}" style="width: 14px; height: 14px; margin-right: 4px;"></i>
                        ${component.label}
                    </div>
                    <div class="breakdown-score">
                        ${breakdown[component.key]} <span class="breakdown-max">/ ${component.max}</span>
                    </div>
                </div>
                <div class="breakdown-progress">
                    <div class="progress-bar" style="width: ${(breakdown[component.key] / component.max) * 100}%"></div>
                </div>
            </div>
        `).join('');

    const style = document.createElement('style');
    style.textContent = `
            .breakdown-progress {
                width: 60px;
                height: 6px;
                background: var(--border);
                border-radius: 3px;
                overflow: hidden;
            }
            .progress-bar {
                height: 100%;
                background: var(--gradient-primary);
                transition: width 1s ease;
            }
        `;
    document.head.appendChild(style);

    this.initializeLucide();
  }

  updateStatsGrid(details) {
    const stats = [
      {
        icon: 'dollar-sign',
        value: this.formatCurrency(details.netWorth || 0),
        label: 'Net Worth'
      },
      {
        icon: 'link',
        value: details.activeChains || 0,
        label: 'Active Chains'
      },
      {
        icon: 'hash',
        value: this.formatNumber(details.transactionCount || 0),
        label: 'Transactions'
      },
      {
        icon: 'calendar',
        value: `${Math.floor((details.walletAgeMonths || 0) / 12)}y ${(details.walletAgeMonths || 0) % 12}m`,
        label: 'Wallet Age'
      },
      {
        icon: 'coins',
        value: details.uniqueTokenTypes || 0,
        label: 'Token Types'
      },
      {
        icon: 'image',
        value: details.totalNFTs || 0,
        label: 'NFTs'
      }
    ];

    this.elements.statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card scale-in">
                <div class="stat-icon">
                    <i data-lucide="${stat.icon}"></i>
                </div>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');

    this.initializeLucide();
  }

  updateOverviewGrid(data) {
    const overviewItems = [
      {
        title: 'Identity & Domains',
        icon: 'user',
        content: `
                    <div style="margin-bottom: 12px;">
                        <strong>ENS Domain:</strong> ${data.details.hasENS ? '✅ Verified' : '❌ Not Found'}
                    </div>
                    <div>
                        <strong>Unstoppable Domain:</strong> ${data.details.hasUnstoppableDomain ? '✅ Verified' : '❌ Not Found'}
                    </div>
                `
      },
      {
        title: 'DeFi Engagement',
        icon: 'trending-up',
        content: `
                    <div style="margin-bottom: 12px;">
                        <strong>Active Protocols:</strong> ${data.details.defiProtocols?.length || 0}
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Total Positions:</strong> ${data.details.defiPositions || 0}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                        ${data.details.defiProtocols?.slice(0, 3).join(', ') || 'No protocols found'}
                    </div>
                `
      },
      {
        title: 'Security Analysis',
        icon: 'shield',
        content: `
                    <div style="margin-bottom: 12px;">
                        <strong>Total Approvals:</strong> ${data.details.totalApprovals || 0}
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Active Approvals:</strong> ${data.details.activeApprovals || 0}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                        ${data.details.totalApprovals > 0 ?
            `${Math.round((data.details.activeApprovals / data.details.totalApprovals) * 100)}% approval ratio` :
            'No approvals found'}
                    </div>
                `
      },
      {
        title: 'Profitability',
        icon: 'dollar-sign',
        content: `
                    <div style="margin-bottom: 12px;">
                        <strong>Total P&L:</strong> ${this.formatCurrency(data.details.totalPnL || 0)}
                    </div>
                    <div style="margin-bottom: 12px;">
                        <strong>Profitable Chains:</strong> ${data.details.profitableChainsCount || 0}
                    </div>
                    <div style="font-size: 12px; color: ${data.details.totalPnL >= 0 ? '#10b981' : '#ef4444'};">
                        ${data.details.totalPnL >= 0 ? '📈 Profitable' : '📉 Loss'}
                    </div>
                `
      }
    ];

    this.elements.overviewGrid.innerHTML = overviewItems.map(item => `
            <div class="overview-card">
                <h4 class="overview-card-title">
                    <i data-lucide="${item.icon}"></i>
                    ${item.title}
                </h4>
                <div class="overview-card-content">
                    ${item.content}
                </div>
            </div>
        `).join('');

    this.initializeLucide();
  }

  switchTab(tabId) {
    this.elements.tabBtns.forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    this.elements.tabPanels.forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`).classList.add('active');
  }

  formatCurrency(value) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${Math.round(value)}`;
  }

  formatNumber(value) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <i data-lucide="${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

    const style = document.createElement('style');
    style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 20px;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                z-index: 1000;
                animation: slideInRight 0.3s ease;
                max-width: 400px;
            }
            .notification-success { border-left: 4px solid var(--success); }
            .notification-error { border-left: 4px solid var(--error); }
            .notification-info { border-left: 4px solid var(--primary); }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                color: var(--text-primary);
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);

    document.body.appendChild(notification);
    this.initializeLucide();

    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  }

  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'x-circle';
      case 'warning': return 'alert-triangle';
      default: return 'info';
    }
  }

  async generateCertificate() {
    if (!this.currentWalletData) {
      this.showNotification('Please analyze a wallet first', 'error');
      return;
    }

    const walletAddress = this.currentWalletData.walletAddress;
    const selectedChains = this.getSelectedChains();

    try {
      this.elements.generateCertificateBtn.disabled = true;
      this.elements.generateCertificateBtn.innerHTML = `
        <div style="width: 18px; height: 18px; border: 2px solid transparent; border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        Generating Certificate...
      `;

      const response = await fetch('/api/mint-score-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          chains: selectedChains
        })
      });

      const result = await response.json();

      if (result.success) {
        const certificate = result.certificate;

        this.elements.certificateResult.classList.remove('hidden');
        this.elements.certificateResult.innerHTML = `
          <div class="certificate-success">
            <div class="certificate-badge">
              <img src="${certificate.badgeImageUrl}" alt="${certificate.tier} Badge" class="tier-badge-img">
              <div class="certificate-info">
                <div class="certificate-tier">🏆 ${certificate.tier} Tier</div>
                <div class="certificate-score">Score: ${certificate.totalScore}/100</div>
              </div>
            </div>
            
            <div class="certificate-actions-grid">
              <button onclick="navigator.clipboard.writeText('${certificate.shareableMessage}'); app.showNotification('Copied to clipboard!', 'success')" class="certificate-action-btn">
                <i data-lucide="copy"></i>
                Copy Share Text
              </button>
              
              <a href="${certificate.badgeImageUrl}" target="_blank" class="certificate-action-btn">
                <i data-lucide="download"></i>
                Download Badge
              </a>
              
              <button onclick="app.shareCertificate('${certificate.walletAddress}', '${certificate.tier}', ${certificate.totalScore})" class="certificate-action-btn">
                <i data-lucide="share-2"></i>
                Share on Social
              </button>
            </div>
            
            <div class="certificate-metadata">
              <div class="metadata-item">
                <span>Wallet:</span>
                <span>${certificate.walletAddress.slice(0, 6)}...${certificate.walletAddress.slice(-4)}</span>
              </div>
              <div class="metadata-item">
                <span>Generated:</span>
                <span>${new Date(certificate.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        `;

        this.showNotification(`🏆 ${certificate.tier} Certificate Generated!`, 'success');
        this.initializeLucide();
      } else {
        throw new Error(result.error || 'Failed to generate certificate');
      }

    } catch (error) {
      console.error('Certificate generation error:', error);
      this.showNotification(`Failed to generate certificate: ${error.message}`, 'error');
      this.elements.certificateResult.classList.add('hidden');
    } finally {
      this.elements.generateCertificateBtn.disabled = false;
      this.elements.generateCertificateBtn.innerHTML = `
        <i data-lucide="award" class="btn-icon"></i>
        Generate NFT Certificate
      `;
      this.initializeLucide();
    }
  }

  shareCertificate(walletAddress, tier, score) {
    const shareText = `🏆 Just got my OnChain Credit Score!

Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}
Tier: ${tier} 
Score: ${score}/100

Analyze your wallet at: ${window.location.href}

#OnChainScore #DeFi #Web3 #CreditScore`;

    if (navigator.share) {
      navigator.share({
        title: 'My OnChain Credit Score',
        text: shareText,
        url: window.location.href
      });
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(twitterUrl, '_blank');
    }
  }

  getSelectedChains() {
    const checkboxes = document.querySelectorAll('input[name="chain"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OnChainScoreApp();
});

if (typeof window.ethereum !== 'undefined') {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      location.reload();
    } else {
      location.reload();
    }
  });

  window.ethereum.on('chainChanged', () => {
    location.reload();
  });
}
