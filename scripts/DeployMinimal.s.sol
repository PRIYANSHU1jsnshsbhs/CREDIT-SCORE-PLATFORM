// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/forge-std/src/Script.sol";
import "../src/OnChainScore.sol";

contract MinimalDeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);

        OnChainScore onChainScore = new OnChainScore(deployer);

        vm.stopBroadcast();

        console.log("OnChainScore deployed to:", address(onChainScore));
        console.log("Owner set to:", deployer);
        console.log("Basic deployment complete!");
        console.log("");
        console.log(
            "Next step: Run setTierImages() later when you have more tokens"
        );
        console.log("This saves ~80% of deployment gas!");
    }
}
