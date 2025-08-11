// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test, console2} from "../lib/forge-std/src/Test.sol";
import {OnChainScore} from "../src/OnChainScore.sol";

contract OnChainScoreTest is Test {
    OnChainScore public onChainScore;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        onChainScore = new OnChainScore(owner);
    }

    function test_InitialState() public {
        assertEq(onChainScore.owner(), owner);
        assertEq(onChainScore.name(), "OnChain Credit Score");
        assertEq(onChainScore.symbol(), "OCCS");
    }

    function test_UpdateScore() public {
        uint256 totalScore = 85;
        uint256[7] memory componentScores = [uint256(15), 12, 13, 11, 10, 6, 8];

        vm.prank(owner);
        onChainScore.addAuthorizedScorer(owner);

        vm.prank(owner);
        onChainScore.updateScore(user1, totalScore, componentScores, "Elite");

        OnChainScore.ScoreData memory scoreData = onChainScore.getWalletScore(
            user1
        );

        assertEq(scoreData.totalScore, totalScore);
        assertEq(scoreData.tier, "Elite");
        assertEq(scoreData.portfolioScore, 15);
        assertEq(scoreData.activityScore, 12);
        assertTrue(scoreData.timestamp > 0);
        assertTrue(scoreData.isValid);
    }

    function test_OnlyAuthorizedCanUpdateScore() public {
        uint256 totalScore = 85;
        uint256[7] memory componentScores = [uint256(15), 12, 13, 11, 10, 6, 8];

        vm.prank(user1);
        vm.expectRevert();
        onChainScore.updateScore(user2, totalScore, componentScores, "Elite");
    }

    function test_GetScoreHistory() public {
        uint256 totalScore = 85;
        uint256[7] memory componentScores = [uint256(15), 12, 13, 11, 10, 6, 8];

        vm.prank(owner);
        onChainScore.addAuthorizedScorer(owner);

        vm.prank(owner);
        onChainScore.updateScore(user1, totalScore, componentScores, "Elite");

        OnChainScore.ScoreData memory scoreData = onChainScore.getWalletScore(
            user1
        );
        assertEq(scoreData.totalScore, totalScore);
    }

    function test_GetWalletsScores() public {
        uint256 totalScore = 85;
        uint256[7] memory componentScores = [uint256(15), 12, 13, 11, 10, 6, 8];

        vm.prank(owner);
        onChainScore.addAuthorizedScorer(owner);

        vm.startPrank(owner);
        onChainScore.updateScore(user1, totalScore, componentScores, "Elite");
        onChainScore.updateScore(
            user2,
            totalScore - 5,
            componentScores,
            "Premium"
        );
        vm.stopPrank();

        OnChainScore.ScoreData memory score1 = onChainScore.getWalletScore(
            user1
        );
        OnChainScore.ScoreData memory score2 = onChainScore.getWalletScore(
            user2
        );

        assertEq(score1.totalScore, totalScore);
        assertEq(score2.totalScore, totalScore - 5);
        assertEq(score1.tier, "Elite");
        assertEq(score2.tier, "Premium");
    }

    function test_BadgeOperations() public {
        uint256 totalScore = 85;
        uint256[7] memory componentScores = [uint256(15), 12, 13, 11, 10, 6, 8];

        vm.startPrank(owner);
        onChainScore.addAuthorizedScorer(owner);
        onChainScore.updateScore(user1, totalScore, componentScores, "Elite");

        uint256 badgeId = onChainScore.createBadge(
            "High Score",
            "Achieved score > 80",
            "ipfs://badge-uri",
            80,
            1
        );
        vm.stopPrank();

        uint256[] memory badges = onChainScore.getWalletBadges(user1);

        (
            string memory name,
            string memory description,
            string memory imageURI,
            uint256 minScore,
            uint256 categoryMask
        ) = onChainScore.badges(badgeId);

        assertEq(name, "High Score");
        assertEq(description, "Achieved score > 80");
        assertEq(imageURI, "ipfs://badge-uri");
        assertEq(minScore, 80);
    }

    function test_ScoreVerification() public {
        uint256 totalScore = 85;
        uint256[7] memory componentScores = [uint256(15), 12, 13, 11, 10, 6, 8];

        vm.prank(owner);
        onChainScore.addAuthorizedScorer(owner);

        vm.startPrank(owner);
        onChainScore.updateScore(user1, totalScore, componentScores, "Elite");
        onChainScore.updateScore(user2, 80, componentScores, "Premium");
        vm.stopPrank();

        vm.prank(user2);
        onChainScore.verifyScore(user1);

        uint256 verificationCount = onChainScore.getVerificationCount(user1);

        OnChainScore.ScoreData memory scoreData = onChainScore.getWalletScore(
            user1
        );
        assertTrue(scoreData.isValid);
    }
}
