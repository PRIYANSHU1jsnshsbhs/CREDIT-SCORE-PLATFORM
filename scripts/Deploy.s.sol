// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/forge-std/src/Script.sol";
import "../src/OnChainScore.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        OnChainScore onChainScore = new OnChainScore(deployer);

        string[] memory tiers = new string[](10);
        string[] memory images = new string[](10);

        tiers[0] = "S+";
        images[
            0
        ] = "bafkreiaboko6j4gw36dkfkeisddpjgowr5kmhdzcwhmauvhqt2bios4fx4";

        tiers[1] = "S";
        images[
            1
        ] = "bafkreifzn6snlqfmghtsjqxqjrlnpacgdh7aq5q7qr5yw6p4kzv3z3qbfm";

        tiers[2] = "A+";
        images[
            2
        ] = "bafkreifyb5v74qrq7hqjgqwagpjnbv7tltnf3c7ksnsphgf3jrvlqkzscy";

        tiers[3] = "A";
        images[
            3
        ] = "bafkreihjjlyhgxqp5cphzm2ibhkshqgd3xgipj6pnedtkpbv2twbbsaxiq";

        tiers[4] = "B+";
        images[
            4
        ] = "bafkreicmgp2xdttgrtdkfhcgrh2sn6t5qfkywfttnc4twddlc4qjx2xnti";

        tiers[5] = "B";
        images[
            5
        ] = "bafkreif6n5ysecgwi3qfzwnlfgficmgmzokdjwuawlxwpwxbkfgsqntvl4";

        tiers[6] = "C+";
        images[
            6
        ] = "bafkreiaxstpwjl6cnb3jjkdbj2tkdbtb2plf32zsnhsgnzrqaolkxgqd7q";

        tiers[7] = "C";
        images[
            7
        ] = "bafkreihgcrlgxqzw4jdqsumffz5wpxfkvxqzrgzr4y6qrqcwx5hgc6uqq4";

        tiers[8] = "D";
        images[
            8
        ] = "bafkreia3pbprqnbbzwdh3e73uocydpozgcqq3z4ikn5jkfdpgnmkzr4nmu";

        tiers[9] = "F";
        images[
            9
        ] = "bafkreihdlz7uvdyzkjhpfrm5jw4u47pqd2y6lpmmszpqzgykdtvwnxczne";

        onChainScore.setTierImages(tiers, images);

        vm.stopBroadcast();

        console.log("OnChainScore deployed to:", address(onChainScore));
        console.log("Owner set to:", deployer);
        console.log("Tier images configured with your custom badges!");
        console.log("Total badges configured:", tiers.length);
        console.log("");
        console.log(
            "Deployment complete! Your OnChain Score NFT system is ready!"
        );
        console.log("Contract deployed with tier-specific badge support");
        console.log("All 10 tier badges configured with IPFS hashes");
        console.log("Ready to mint score certificates!");
    }
}
