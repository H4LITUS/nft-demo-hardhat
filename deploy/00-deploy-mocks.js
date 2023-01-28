const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.1");
const GAS_PRICE_LINK = 1e9;
const DECIMALS = 18;
const INITIAL_ANSWER = ethers.utils.parseEther("2000");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, log } = deployments;

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying Mocks...");
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        });

        await deploy("MockV3Aggregator", {
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_ANSWER],
        });
        log("Mocks deployed!");
        log("------------------------------------");
    }
};

module.exports.tags = ["all", "mocks"];
