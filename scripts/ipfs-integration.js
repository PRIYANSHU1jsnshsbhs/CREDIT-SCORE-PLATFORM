const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
require('dotenv').config();

class IPFSIntegration {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataBaseUrl = 'https://api.pinata.cloud';
  }

  /**
   * Upload a single file to IPFS via Pinata
   */
  async uploadFile(filePath, fileName = null) {
    try {
      const formData = new FormData();
      const fileStream = fs.createReadStream(filePath);
      const actualFileName = fileName || path.basename(filePath);

      formData.append('file', fileStream, actualFileName);

      const metadata = JSON.stringify({
        name: actualFileName,
        keyvalues: {
          type: 'onchain-score-badge'
        }
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 1,
      });
      formData.append('pinataOptions', options);

      const response = await axios.post(
        `${this.pinataBaseUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: 'Infinity',
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );

      return {
        success: true,
        hash: response.data.IpfsHash,
        url: `ipfs://${response.data.IpfsHash}`,
        gateway: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
      };

    } catch (error) {
      console.error('Error uploading to IPFS:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload all badge images to IPFS
   */
  async uploadAllBadges() {
    console.log('🚀 Uploading Badge Images to IPFS');
    console.log('==================================\n');

    const badgesDir = path.join(__dirname, '../images/badges');
    const mappingFile = path.join(badgesDir, 'badge-mapping.json');

    if (!fs.existsSync(mappingFile)) {
      console.log('❌ Badge mapping not found. Creating one based on existing files...');

      const badgeFiles = fs.readdirSync(badgesDir).filter(file =>
        file.endsWith('.png') && !file.includes('all-badges')
      );

      if (badgeFiles.length === 0) {
        console.log('❌ No badge PNG files found in images/badges/');
        return;
      }

      console.log(`📁 Found ${badgeFiles.length} badge files:`, badgeFiles);
    }

    if (!this.pinataApiKey || !this.pinataSecretKey) {
      console.log('❌ Pinata API keys not found in environment variables.');
      console.log('   PINATA_API_KEY:', this.pinataApiKey ? '✅ Found' : '❌ Missing');
      console.log('   PINATA_SECRET_KEY:', this.pinataSecretKey ? '✅ Found' : '❌ Missing');
      console.log('   Please set PINATA_API_KEY and PINATA_SECRET_KEY in .env file');
      console.log('   Get free API keys at: https://app.pinata.cloud/');
      return;
    }

    try {
      let badgeMapping;

      if (fs.existsSync(mappingFile)) {
        badgeMapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      } else {
        badgeMapping = {};
        const badgeFiles = fs.readdirSync(badgesDir).filter(file =>
          file.endsWith('.png') && !file.includes('all-badges')
        );

        for (const file of badgeFiles) {
          const tier = file.replace('.png', '');
          badgeMapping[tier] = {
            filename: file,
            path: `images/badges/${file}`,
            tier: tier
          };
        }
      }

      const uploadResults = {};

      console.log('📤 Uploading badge images...\n');

      for (const [tier, badgeInfo] of Object.entries(badgeMapping)) {
        const badgePath = path.join(__dirname, '../', badgeInfo.path);

        if (fs.existsSync(badgePath)) {
          console.log(`⏳ Uploading ${tier} badge...`);

          const result = await this.uploadFile(badgePath, badgeInfo.filename);

          if (result.success) {
            console.log(`✅ ${tier}: ${result.hash}`);
            uploadResults[tier] = {
              ...badgeInfo,
              ipfs_hash: result.hash,
              ipfs_url: result.url,
              gateway_url: result.gateway
            };
          } else {
            console.log(`❌ ${tier}: Failed - ${result.error}`);
            uploadResults[tier] = {
              ...badgeInfo,
              error: result.error
            };
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`❌ ${tier}: File not found - ${badgePath}`);
        }
      }      // Save updated mapping with IPFS hashes
      const outputFile = path.join(badgesDir, 'badge-mapping-ipfs.json');
      fs.writeFileSync(outputFile, JSON.stringify(uploadResults, null, 2));

      console.log(`\n🎉 Upload complete! Results saved to: ${outputFile}`);
      console.log('\n🔧 Next Steps:');
      console.log('1. Deploy smart contract with tier image support');
      console.log('2. Call setTierImages() with the IPFS hashes');
      console.log('3. Test certificate generation with new images');

      return uploadResults;

    } catch (error) {
      console.error('❌ Error uploading badges:', error.message);
    }
  }

  /**
   * Generate smart contract function calls for setting tier images
   */
  async generateSmartContractCalls() {
    const badgesDir = path.join(__dirname, '../images/badges');
    const mappingFile = path.join(badgesDir, 'badge-mapping-ipfs.json');

    if (!fs.existsSync(mappingFile)) {
      console.log('❌ IPFS mapping not found. Run uploadAllBadges() first.');
      return;
    }

    try {
      const badgeMapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      const tiers = [];
      const hashes = [];

      for (const [tier, badgeInfo] of Object.entries(badgeMapping)) {
        if (badgeInfo.ipfs_hash) {
          tiers.push(tier);
          hashes.push(badgeInfo.ipfs_hash);
        }
      }

      console.log('📋 Smart Contract Function Calls:');
      console.log('================================\n');

      console.log('// Individual calls:');
      for (const [tier, badgeInfo] of Object.entries(badgeMapping)) {
        if (badgeInfo.ipfs_hash) {
          console.log(`await contract.setTierImage("${tier}", "${badgeInfo.ipfs_hash}");`);
        }
      }

      console.log('\n// Batch call:');
      console.log(`const tiers = [${tiers.map(t => `"${t}"`).join(', ')}];`);
      console.log(`const hashes = [${hashes.map(h => `"${h}"`).join(', ')}];`);
      console.log('await contract.setTierImages(tiers, hashes);');

      console.log('\n// JavaScript array for integration:');
      console.log('const tierImages = {');
      for (const [tier, badgeInfo] of Object.entries(badgeMapping)) {
        if (badgeInfo.ipfs_hash) {
          console.log(`  "${tier}": "${badgeInfo.ipfs_hash}",`);
        }
      }
      console.log('};');

    } catch (error) {
      console.error('❌ Error generating calls:', error.message);
    }
  }
}

module.exports = { IPFSIntegration };

if (require.main === module) {
  const ipfs = new IPFSIntegration();

  if (process.argv[2] === 'upload') {
    ipfs.uploadAllBadges();
  } else if (process.argv[2] === 'calls') {
    ipfs.generateSmartContractCalls();
  } else {
    console.log('Usage:');
    console.log('  node scripts/ipfs-integration.js upload  - Upload all badges to IPFS');
    console.log('  node scripts/ipfs-integration.js calls   - Generate smart contract calls');
  }
}
