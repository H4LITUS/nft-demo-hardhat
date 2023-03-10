const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const fs = require("fs");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    log("----------------------------");

    let lowSvg, highSvg, ethUsdPriceFeedAddress;
    const chainId = network.config.chainId;

    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await ethers.getContract("MockV3Aggregator");
        ethUsdPriceFeedAddress = ethUsdAggregator.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];
    }

    lowSvg = await fs.readFileSync("./images/dynamicNft/frown.svg", {
        encoding: "utf8",
    });
    highSvg = await fs.readFileSync("./images/dynamicNft/happy.svg", {
        encoding: "utf8",
    });

    const args = [lowSvg, highSvg, ethUsdPriceFeedAddress];

    const dynamicSvgNft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying......");
        await verify(dynamicSvgNft.address, args);
    }
};

module.exports.tags = ["all", "dynamicSvgNft", "main"];
