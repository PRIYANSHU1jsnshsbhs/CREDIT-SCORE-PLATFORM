// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/openzeppelin-contracts/contracts/utils/Strings.sol";
import "../lib/openzeppelin-contracts/contracts/utils/Base64.sol";

/**
 * @title OnChainScore
 * @dev Smart contract for storing and managing onchain credit scores
 */
contract OnChainScore is ERC721, Ownable, ReentrancyGuard {
    struct ScoreData {
        uint256 totalScore;
        uint256 portfolioScore;
        uint256 activityScore;
        uint256 defiScore;
        uint256 diversificationScore;
        uint256 securityScore;
        uint256 identityScore;
        uint256 profitabilityScore;
        uint256 timestamp;
        string tier;
        bool isValid;
    }

    struct BadgeData {
        string name;
        string description;
        string imageURI;
        uint256 minScore;
        uint256 categoryMask; // Bitmask for categories
    }

    event ScoreUpdated(address indexed wallet, uint256 newScore, string tier);
    event BadgeEarned(
        address indexed wallet,
        uint256 badgeId,
        string badgeName
    );
    event ScoreVerified(address indexed wallet, address indexed verifier);

    mapping(address => ScoreData) public walletScores;
    mapping(address => uint256[]) public walletBadges;
    mapping(uint256 => BadgeData) public badges;
    mapping(address => bool) public authorizedScorers;
    mapping(address => mapping(address => bool)) public scoreVerifications;
    mapping(address => uint256) public walletCertificates; // wallet => tokenId
    mapping(uint256 => string) public certificateImages; // tokenId => IPFS hash

    uint256 private _currentTokenId = 0;
    uint256 private _badgeCounter = 0;

    mapping(address => uint256) private _walletToTokenId;
    mapping(address => bool) public hasCertificateMapping;
    string private baseCertificateImage;

    mapping(string => string) private tierImages; // tier => IPFS hash

    string[10] private tiers = [
        "F",
        "D",
        "C",
        "C+",
        "B",
        "B+",
        "A",
        "A+",
        "S",
        "S+"
    ];

    constructor(
        address initialOwner
    ) ERC721("OnChain Credit Score", "OCCS") Ownable(initialOwner) {
        baseCertificateImage = "QmYourDefaultImageHash"; // Default placeholder
    }

    modifier onlyAuthorized() {
        require(
            authorizedScorers[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    /**
     * @dev Set base certificate image (owner only)
     */
    function setBaseCertificateImage(
        string memory _imageHash
    ) external onlyOwner {
        baseCertificateImage = _imageHash;
    }

    /**
     * @dev Set tier-specific badge image (owner only)
     */
    function setTierImage(
        string memory tier,
        string memory imageHash
    ) external onlyOwner {
        tierImages[tier] = imageHash;
    }

    /**
     * @dev Set multiple tier images at once (owner only)
     */
    function setTierImages(
        string[] memory tierList,
        string[] memory imageHashes
    ) external onlyOwner {
        require(
            tierList.length == imageHashes.length,
            "Arrays length mismatch"
        );

        for (uint256 i = 0; i < tierList.length; i++) {
            tierImages[tierList[i]] = imageHashes[i];
        }
    }

    /**
     * @dev Get tier image hash
     */
    function getTierImage(
        string memory tier
    ) external view returns (string memory) {
        return tierImages[tier];
    }

    /**
     * @dev Add authorized scorer (backend server)
     */
    function addAuthorizedScorer(address scorer) external onlyOwner {
        authorizedScorers[scorer] = true;
    }

    /**
     * @dev Remove authorized scorer
     */
    function removeAuthorizedScorer(address scorer) external onlyOwner {
        authorizedScorers[scorer] = false;
    }

    /**
     * @dev Update wallet score (called by backend)
     */
    function updateScore(
        address wallet,
        uint256 totalScore,
        uint256[7] memory componentScores, // [portfolio, activity, defi, diversification, security, identity, profitability]
        string memory tier
    ) external onlyAuthorized {
        require(totalScore <= 100, "Score cannot exceed 100");

        walletScores[wallet] = ScoreData({
            totalScore: totalScore,
            portfolioScore: componentScores[0],
            activityScore: componentScores[1],
            defiScore: componentScores[2],
            diversificationScore: componentScores[3],
            securityScore: componentScores[4],
            identityScore: componentScores[5],
            profitabilityScore: componentScores[6],
            timestamp: block.timestamp,
            tier: tier,
            isValid: true
        });

        emit ScoreUpdated(wallet, totalScore, tier);

        _checkAndAwardBadges(wallet, totalScore, componentScores);

        _mintOrUpdateCertificate(wallet, totalScore, tier);
    }

    /**
     * @dev Create new achievement badge
     */
    function createBadge(
        string memory name,
        string memory description,
        string memory imageURI,
        uint256 minScore,
        uint256 categoryMask
    ) external onlyOwner returns (uint256) {
        uint256 badgeId = _badgeCounter++;
        badges[badgeId] = BadgeData({
            name: name,
            description: description,
            imageURI: imageURI,
            minScore: minScore,
            categoryMask: categoryMask
        });
        return badgeId;
    }

    /**
     * @dev Get wallet's complete score data
     */
    function getWalletScore(
        address wallet
    ) external view returns (ScoreData memory) {
        return walletScores[wallet];
    }

    /**
     * @dev Get wallet's badges
     */
    function getWalletBadges(
        address wallet
    ) external view returns (uint256[] memory) {
        return walletBadges[wallet];
    }

    /**
     * @dev Verify another wallet's score
     */
    function verifyScore(address wallet) external {
        require(
            walletScores[msg.sender].isValid,
            "Verifier must have valid score"
        );
        require(
            walletScores[msg.sender].totalScore >= 60,
            "Verifier must have minimum score"
        );

        scoreVerifications[wallet][msg.sender] = true;
        emit ScoreVerified(wallet, msg.sender);
    }

    /**
     * @dev Get verification count for wallet
     */
    function getVerificationCount() external pure returns (uint256) {
        return 0; // Placeholder
    }

    /**
     * @dev Internal function to check and award badges
     */
    function _checkAndAwardBadges(
        address wallet,
        uint256 totalScore,
        uint256[7] memory componentScores
    ) internal {
        if (componentScores[2] >= 18 && !_hasBadge(wallet, 0)) {
            walletBadges[wallet].push(0);
            emit BadgeEarned(wallet, 0, "DeFi Master");
        }

        if (componentScores[4] >= 9 && !_hasBadge(wallet, 1)) {
            walletBadges[wallet].push(1);
            emit BadgeEarned(wallet, 1, "Security Champion");
        }

        if (componentScores[0] >= 22 && !_hasBadge(wallet, 2)) {
            walletBadges[wallet].push(2);
            emit BadgeEarned(wallet, 2, "Crypto Whale");
        }

        if (totalScore == 100 && !_hasBadge(wallet, 3)) {
            walletBadges[wallet].push(3);
            emit BadgeEarned(wallet, 3, "Perfect Score");
        }
    }

    /**
     * @dev Check if wallet has specific badge
     */
    function _hasBadge(
        address wallet,
        uint256 badgeId
    ) internal view returns (bool) {
        uint256[] memory userBadges = walletBadges[wallet];
        for (uint256 i = 0; i < userBadges.length; i++) {
            if (userBadges[i] == badgeId) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Mint or update NFT certificate (called for every score analysis)
     */
    function _mintOrUpdateCertificate(
        address to,
        uint256 /* totalScore */,
        string memory /* tier */
    ) internal {
        uint256 existingTokenId = walletCertificates[to];

        if (existingTokenId == 0) {
            uint256 tokenId = _currentTokenId++;
            walletCertificates[to] = tokenId;
            certificateImages[tokenId] = baseCertificateImage;
            _safeMint(to, tokenId);
        }
    }

    /**
     * @dev Get wallet's certificate token ID
     */
    function getWalletCertificate(
        address wallet
    ) external view returns (uint256) {
        return walletCertificates[wallet];
    }

    /**
     * @dev Check if wallet has certificate
     */
    function hasCertificate(address wallet) external view returns (bool) {
        return walletCertificates[wallet] != 0;
    }

    /**
     * @dev Get token URI for NFT certificates
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        address tokenOwner = ownerOf(tokenId);
        ScoreData memory scoreData = walletScores[tokenOwner];

        string memory name = string(
            abi.encodePacked(
                '"name":"OnChain Credit Score Certificate #',
                Strings.toString(tokenId),
                '"'
            )
        );

        string
            memory description = '"description":"Official OnChain Credit Score Certificate showing Web3 reputation and achievements"';

        string memory imageHash = bytes(tierImages[scoreData.tier]).length > 0
            ? tierImages[scoreData.tier]
            : certificateImages[tokenId];

        string memory image = string(
            abi.encodePacked('"image":"ipfs://', imageHash, '"')
        );

        string memory attributes = string(
            abi.encodePacked(
                '"attributes":[',
                '{"trait_type":"Total Score","value":',
                Strings.toString(scoreData.totalScore),
                "},",
                '{"trait_type":"Tier","value":"',
                scoreData.tier,
                '"},',
                '{"trait_type":"Portfolio Score","value":',
                Strings.toString(scoreData.portfolioScore),
                "},",
                '{"trait_type":"DeFi Score","value":',
                Strings.toString(scoreData.defiScore),
                "}",
                "]"
            )
        );

        string memory json = string(
            abi.encodePacked(
                "{",
                name,
                ",",
                description,
                ",",
                image,
                ",",
                attributes,
                "}"
            )
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(bytes(json))
                )
            );
    }
}
