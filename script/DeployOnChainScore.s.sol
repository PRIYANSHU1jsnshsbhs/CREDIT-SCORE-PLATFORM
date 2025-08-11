// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console2} from "../lib/forge-std/src/Script.sol";
import {OnChainScore} from "../src/OnChainScore.sol";

contract DeployOnChainScore is Script {
    OnChainScore public onChainScore;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying OnChainScore contract...");
        console2.log("Deployer address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        onChainScore = new OnChainScore(deployer);

        vm.stopBroadcast();

        console2.log("OnChainScore deployed at:", address(onChainScore));
        console2.log("Owner:", onChainScore.owner());

        require(onChainScore.owner() == deployer, "Owner not set correctly");
        console2.log("Contract deployed successfully!");
    }

    function deployWithOwner(address initialOwner) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console2.log("Deploying OnChainScore contract with custom owner...");
        console2.log("Initial Owner:", initialOwner);

        vm.startBroadcast(deployerPrivateKey);

        onChainScore = new OnChainScore(initialOwner);

        vm.stopBroadcast();

        console2.log("OnChainScore deployed at:", address(onChainScore));
        console2.log("Owner:", onChainScore.owner());
    }
}
