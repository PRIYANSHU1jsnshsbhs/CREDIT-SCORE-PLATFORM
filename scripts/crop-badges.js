const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function cropBadges() {
  console.log('🎨 Badge Cropping Tool');
  console.log('====================\n');

  const possiblePaths = [
    path.join(__dirname, '../images/all-badges.png'),
    path.join(__dirname, '../images/all-badges.jpg'),
    path.join(__dirname, '../images/all-badges.jpeg')
  ];

  let inputPath = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      inputPath = testPath;
      break;
    }
  }

  if (!inputPath) {
    console.log('❌ Badge image not found!');
    console.log('📸 Please save your badge image as one of:');
    console.log('   - images/all-badges.png');
    console.log('   - images/all-badges.jpg');
    console.log('   - images/all-badges.jpeg');
    console.log('   Then run this script again.');
    return;
  }

  const outputDir = path.join(__dirname, '../images/badges');
  console.log(`📁 Found badge image: ${path.basename(inputPath)}`);

  try {
    const image = sharp(inputPath);
    const { width, height } = await image.metadata();

    console.log(`✅ Loaded image: ${width}x${height} pixels`);

    const badgeWidth = Math.floor(width / 4);
    const badgeHeight = Math.floor(height / 3);

    console.log(`📐 Each badge: ${badgeWidth}x${badgeHeight} pixels\n`);    // Badge definitions matching your image layout
    const badges = [
      { name: 'S+_crypto_whale', tier: 'S+', row: 0, col: 0, scores: '90-100' },
      { name: 'S_defi_expert', tier: 'S', row: 0, col: 1, scores: '80-89' },
      { name: 'A+_advanced_user', tier: 'A+', row: 0, col: 2, scores: '70-79' },
      { name: 'A_experienced_user', tier: 'A', row: 0, col: 3, scores: '60-69' },

      { name: 'B+_active_user', tier: 'B+', row: 1, col: 0, scores: '50-59' },
      { name: 'B_regular_user', tier: 'B', row: 1, col: 1, scores: '40-49' },
      { name: 'C+_casual_user', tier: 'C+', row: 1, col: 2, scores: '30-39' },
      { name: 'C_beginner', tier: 'C', row: 1, col: 3, scores: '20-29' },

      { name: 'D_new_user', tier: 'D', row: 2, col: 0, scores: '10-19' },
      { name: 'F_inactive', tier: 'F', row: 2, col: 1, scores: '0-9' }
    ];

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const badgeMapping = {};

    for (const badge of badges) {
      try {
        const left = badge.col * badgeWidth;
        const top = badge.row * badgeHeight;
        const cropWidth = badgeWidth;
        const cropHeight = badgeHeight;

        const outputPath = path.join(outputDir, `${badge.name}.png`);

        await sharp(inputPath)
          .extract({
            left: Math.max(0, left),
            top: Math.max(0, top),
            width: Math.min(cropWidth, width - left),
            height: Math.min(cropHeight, height - top)
          })
          .png()
          .toFile(outputPath);

        console.log(`✅ ${badge.tier} (${badge.scores}): ${badge.name}.png`);

        const [minScore, maxScore] = badge.scores.split('-').map(Number);
        badgeMapping[badge.tier] = {
          filename: `${badge.name}.png`,
          path: `images/badges/${badge.name}.png`,
          min_score: minScore,
          max_score: maxScore || 100,
          description: badge.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        };

      } catch (error) {
        console.error(`❌ Error cropping ${badge.tier}:`, error.message);
      }
    }

    const mappingPath = path.join(outputDir, 'badge-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(badgeMapping, null, 2));

    console.log(`\n🎉 Successfully cropped ${Object.keys(badgeMapping).length} badges!`);
    console.log(`📁 Badges saved in: ${outputDir}`);
    console.log(`📋 Mapping saved to: ${mappingPath}\n`);

    console.log('🚀 Next Steps:');
    console.log('1. Upload individual badge images to IPFS');
    console.log('2. Update smart contract with IPFS hashes');
    console.log('3. Test certificate generation');

    return badgeMapping;

  } catch (error) {
    console.error('❌ Error processing image:', error.message);
    console.log('\n💡 Make sure your image is saved as: images/all-badges.png');
    console.log('   And that it\'s a valid PNG/JPEG file');
  }
}

if (require.main === module) {
  cropBadges().catch(console.error);
}

module.exports = { cropBadges };
