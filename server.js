const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9000;

app.use(cors());
app.use(express.json()); // Enable JSON body parsing

const logger = (req, res, next) => {
    console.log(`[API Called]: ${req.path}`);
    console.log(`[Method]: ${req.method}`);
    console.log(`[Params]:`, req.body);
    console.log(`[Timestamp]:`, new Date().toISOString());
    
    next(); // Move to the next middleware or route handler
  };

app.use(logger);
  

// Route for getting chain activity
app.post('/api/get-chain-activity', async (req, res) => {
  const { walletAddress } = req.body;

  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/chains?chains%5B0%5D=eth&chains%5B1%5D=polygon&chains%5B2%5D=base&chains%5B3%5D=bsc&chains%5B4%5D=avalanche&chains%5B5%5D=optimism&chains%5B6%5D=arbitrum&chains%5B7%5D=gnosis&chains%5B8%5D=linea`;

  try {
    const response = await axios.get(url, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': process.env.MORALIS_API_KEY, // Use the API key from environment variables
      },
    });

    res.json(response.data); // Send the response data back to the client
  } catch (error) {
    console.error('Error fetching chain activity:', error);
    res.status(500).json({ error: 'Failed to fetch chain activity' });
  }
});

app.post('/api/get-defi-positions', async (req, res) => {
    const { walletAddress, chain } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/defi/positions?chain=${chain}`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY, // Use API key from environment variables
        },
      });
  
      res.json(response.data); // Send the response data back to the client
    } catch (error) {
      console.error(`Error fetching DeFi positions for ${chain}:`, error);
      res.status(500).json({ error: `Failed to fetch DeFi positions for ${chain}` });
    }
  });

  app.post('/api/get-domain-data', async (req, res) => {
    const { walletAddress } = req.body;
  
    try {
      // Fetch ENS domain
      let ensDomain = null;
      try {
        const ensResponse = await axios.get(`https://deep-index.moralis.io/api/v2.2/resolve/${walletAddress}/reverse`, {
          headers: {
            'accept': 'application/json',
            'X-API-Key': process.env.MORALIS_API_KEY, // Use API key from environment variables
          },
        });
  
        // Check if ENS domain exists in response
        if (ensResponse.data && ensResponse.data.name) {
          ensDomain = ensResponse.data.name;
        } else {
          console.log('ENS domain not found or response is null for wallet:', walletAddress);
        }
      } catch (ensError) {
        console.error('Error fetching ENS domain:', ensError.response ? ensError.response.data : ensError.message);
      }
  
      // Fetch Unstoppable Domain
      let unstoppableDomain = null;
      try {
        const udResponse = await axios.get(`https://deep-index.moralis.io/api/v2.2/resolve/${walletAddress}/domain`, {
          headers: {
            'accept': 'application/json',
            'X-API-Key': process.env.MORALIS_API_KEY, // Use API key from environment variables
          },
        });
  
        // Check if Unstoppable Domain exists in response
        if (udResponse.data && udResponse.data.name) {
          unstoppableDomain = udResponse.data.name;
        } else {
          console.log('Unstoppable domain not found or response is null for wallet:', walletAddress);
        }
      } catch (udError) {
        console.error('Error fetching Unstoppable Domain:', udError.response ? udError.response.data : udError.message);
      }
  
      // Send both domains back to the client, even if one is null
      res.status(200).json({ ensDomain, unstoppableDomain });
  
    } catch (error) {
      console.error(`Error processing domain data for wallet ${walletAddress}:`, error);
      res.status(200).json({ ensDomain: null, unstoppableDomain: null });
    }
  });
  
  

  app.post('/api/get-profitability-summary', async (req, res) => {
    const { walletAddress, chain } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/profitability/summary?chain=${chain}`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY, // Use the API key from environment variables
        },
      });
  
      res.json(response.data); // Send the response data back to the client
    } catch (error) {
      console.error(`Error fetching profitability summary for wallet ${walletAddress} on chain ${chain}:`, error);
      res.status(500).json({ error: `Failed to fetch profitability summary for ${chain}` });
    }
  });

  app.post('/api/get-token-approvals', async (req, res) => {
    const { walletAddress, chain } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/approvals?chain=${chain}`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY, // Use API key from environment variables
        },
      });
  
      res.json(response.data.result); // Send the array of approval results back to the client
    } catch (error) {
      console.error(`Error fetching token approvals for wallet ${walletAddress} on chain ${chain}:`, error);
      res.status(500).json({ error: `Failed to fetch token approvals for ${chain}` });
    }
  });

  app.post('/api/get-token-price', async (req, res) => {
    const { tokenAddress, chain } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/price?chain=${chain}&include=percent_change`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY, // Use API key from environment variables
        },
      });
  
      res.json({ usdPrice: response.data.usdPrice }); // Send the USD price back to the client
    } catch (error) {
      console.error(`Error fetching token price for ${tokenAddress} on chain ${chain}:`, error);
      res.status(500).json({ error: `Failed to fetch token price for ${tokenAddress}` });
    }
  });

  app.post('/api/get-transaction-history-and-fees', async (req, res) => {
    const { walletAddress, chain } = req.body;
    let url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/history?chain=${chain}&order=DESC`;
    let totalTransactionFees = 0;
    let allTimestamps = [];
    let cursor = null;
  
    try {
      do {
        const response = await axios.get(`${url}${cursor ? `&cursor=${cursor}` : ''}`, {
          headers: {
            'accept': 'application/json',
            'X-API-Key': process.env.MORALIS_API_KEY,
          },
        });
  
        const data = response.data;
        const transactions = data.result || [];
  
        // Sum transaction fees where from_address matches the wallet address
        transactions.forEach((transaction) => {
          const transactionFee = parseFloat(transaction.transaction_fee || 0);
          if (transaction.from_address.toLowerCase() === walletAddress.toLowerCase()) {
            totalTransactionFees += isNaN(transactionFee) ? 0 : transactionFee;
            allTimestamps.push(transaction.block_timestamp); // Collect timestamps
          }
        });
  
        cursor = data.cursor || null; // Get next cursor, if available
  
      } while (cursor);
  
      totalTransactionFees = isNaN(totalTransactionFees) ? 0 : totalTransactionFees;
  
      res.json({ totalTransactionFees, allTimestamps });
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
  });


  app.post('/api/get-wallet-net-worth', async (req, res) => {
    const { walletAddress, chains } = req.body;
    const chainQuery = chains.map(chain => `chains%5B%5D=${chain}`).join('&');
    const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/net-worth?${chainQuery}&exclude_spam=true&exclude_unverified_contracts=true`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY, // Use API key from environment variables
        },
      });
  
      res.json(response.data); // Send the net worth data back to the client
    } catch (error) {
      console.error(`Error fetching net worth for wallet ${walletAddress}:`, error);
      res.status(500).json({ error: 'Failed to fetch wallet net worth' });
    }
  });

  app.post('/api/resolve-ens', async (req, res) => {
    const { domain } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/resolve/ens/${domain}`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY, // Use API key from environment variables
        },
      });
  
      res.json({ address: response.data.address || null }); // Send the ENS resolution data back to the client
    } catch (error) {
      console.error('Error resolving ENS domain:', error);
      res.status(500).json({ error: 'Failed to resolve ENS domain' });
    }
  });

  app.post('/api/resolve-unstoppable', async (req, res) => {
    const { domain } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/resolve/${domain}?currency=eth`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY, // Use API key from environment variables
        },
      });
  
      res.json({ address: response.data.address || null }); // Send the Unstoppable domain resolution data back to the client
    } catch (error) {
      console.error('Error resolving Unstoppable domain:', error);
      res.status(500).json({ error: 'Failed to resolve Unstoppable domain' });
    }
  });
  
  // Route for risky bets tokens
app.post('/api/get-risky-bets-tokens', async (req, res) => {
    const { chain, max_market_cap, one_week_holders_change, one_week_net_volume_change_usd, one_month_volume_change_usd, security_score, one_month_price_percent_change_usd } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/discovery/tokens/risky-bets?chain=${chain}&max_market_cap=${max_market_cap}&one_week_holders_change=${one_week_holders_change}&one_week_net_volume_change_usd=${one_week_net_volume_change_usd}&one_month_volume_change_usd=${one_month_volume_change_usd}&security_score=${security_score}&one_month_price_percent_change_usd=${one_month_price_percent_change_usd}`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY,
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching risky bets tokens:', error);
      res.status(500).json({ error: 'Failed to fetch risky bets tokens' });
    }
  });

  // Route for solid performers
app.post('/api/get-solid-performers', async (req, res) => {
    const { chain, one_month_net_volume_change_usd, one_week_net_volume_change_usd, one_day_net_volume_change_usd, one_month_volume_change_usd, security_score, one_month_price_percent_change_usd } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/discovery/tokens/solid-performers?chain=${chain}&one_month_net_volume_change_usd=${one_month_net_volume_change_usd}&one_week_net_volume_change_usd=${one_week_net_volume_change_usd}&one_day_net_volume_change_usd=${one_day_net_volume_change_usd}&one_month_volume_change_usd=${one_month_volume_change_usd}&security_score=${security_score}&one_month_price_percent_change_usd=${one_month_price_percent_change_usd}`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY,
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching solid performers:', error);
      res.status(500).json({ error: 'Failed to fetch solid performers' });
    }
  });

  // Route for blue-chip tokens
app.post('/api/get-blue-chip-tokens', async (req, res) => {
    const { chain, min_market_cap, one_week_price_percent_change_usd, one_day_price_percent_change_usd, one_month_volume_change_usd, security_score, one_month_price_percent_change_usd } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/discovery/tokens/blue-chip?chain=${chain}&min_market_cap=${min_market_cap}&one_week_price_percent_change_usd=${one_week_price_percent_change_usd}&one_day_price_percent_change_usd=${one_day_price_percent_change_usd}&one_month_volume_change_usd=${one_month_volume_change_usd}&security_score=${security_score}&one_month_price_percent_change_usd=${one_month_price_percent_change_usd}`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY,
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching blue-chip tokens:', error);
      res.status(500).json({ error: 'Failed to fetch blue-chip tokens' });
    }
  });

  app.post('/api/get-trending-tokens', async (req, res) => {
    const { chain, min_market_cap, security_score } = req.body;
    const url = `https://deep-index.moralis.io/api/v2.2/discovery/tokens/trending?chain=${chain}&min_market_cap=${min_market_cap}&security_score=${security_score}`;
  
    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'X-API-Key': process.env.MORALIS_API_KEY,
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching trending tokens:', error);
      res.status(500).json({ error: 'Failed to fetch trending tokens' });
    }
  });
  
  
  
  
  
  
  
  


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
