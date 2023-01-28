const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata");
const { verify } = require("../utils/verify");
require("dotenv").config();

const imagesLocation = "./images/randomNft";

const metadataTempalte = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
};

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const chainId = network.config.chainId;

    let vrfCoordinatorV2Address,
        subscriptionId,
        keyHash,
        callbackGasLimit,
        tokenUris,
        mintFee,
        vrfCoordinatorV2Mock;

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris();
    }

    tokenUris = [
        "ipfs://QmdnS8Cjcy7yjZvUVEoEjD4uYTwALgKLRHvpC7fn9NXida",
        "ipfs://Qmdvq7dByGESRW7XrCgcgshpGvpBn4UFEHg6mWLzEhzJu6",
        "ipfs://Qma8s9mfyRWkzeJUoiCGKCB9DZCWP7PRbf1rXeH7q8z12E",
    ];

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

        const txResponse = await vrfCoordinatorV2Mock.createSubscription();
        const txReceipt = await txResponse.wait(1);
        subscriptionId = txReceipt.events[0].args.subId;
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }
    keyHash = networkConfig[chainId]["keyHash"];
    callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    mintFee = ethers.utils.parseEther("0.001");

    args = [vrfCoordinatorV2Address, subscriptionId, keyHash, callbackGasLimit, tokenUris, mintFee];

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, ethers.utils.parseEther("100"));
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.address);
    }

    log("--------------------------------------");

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying........");
        await verify(randomIpfsNft.address, args);
    }
};

async function handleTokenUris() {
    const tokenUris = [];

    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);

    for (let imageUploadResponseIndex in imageUploadResponses) {
        // create metadata
        // upload the metadata
        let tokenUriMetadata = { ...metadataTempalte };
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "");
        tokenUriMetadata.description = `A cute little ${tokenUriMetadata.name} pup!`;
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
        console.log(`Uploading ${tokenUriMetadata.name} metadata...`);
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata);
        const tokenUri = `ipfs://${metadataUploadResponse.IpfsHash}`;
        tokenUris.push(tokenUri);
    }
    console.log("Token URIs uploaded");
    console.log(tokenUris);
    return tokenUris;
}

module.exports.tags = ["all", "randomipfs", "main"];
