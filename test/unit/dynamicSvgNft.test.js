const { network, deployments, getNamedAccounts, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("DynamicSvgNft", function () {
          let dynamicSvgNft, ethUsdPriceFeed, deployer;
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["dynamicSvgNft", "mocks"]);
              dynamicSvgNft = await ethers.getContract("DynamicSvgNft");
              ethUsdPriceFeed = await ethers.getContract("MockV3Aggregator");
          });

          describe("constructor dynamicSvgNft", function () {
              it("initializes correctly", async function () {
                  const lowSvg = await dynamicSvgNft.getLowSVG();
                  const highSvg = await dynamicSvgNft.getHighSVG();
                  assert.equal(await dynamicSvgNft.getTokenCounter(), "0");
                  assert.isTrue(lowSvg.includes("data:image/svg+xml"));
                  assert.isTrue(highSvg.includes("data:image/svg+xml"));
                  assert.equal(
                      await dynamicSvgNft.getPriceFeed(),
                      ethUsdPriceFeed.address
                  );
              });
          });

          describe("mintNft", function () {
              let highValue = ethers.utils.parseEther("2000");
              let tokenId;
              beforeEach(async function () {
                  const tx = await dynamicSvgNft.mintNft(highValue);
                  const txResponse = await tx.wait(1);
                  tokenId = txResponse.events[1].args.tokenId;
              });
              it("sets high value correctly of dynamicSvgNft", async function () {
                  const highValueOfTokenId =
                      await dynamicSvgNft.tokenIdToHighValue(tokenId);
                  assert.equal(
                      highValueOfTokenId.toString(),
                      highValue.toString()
                  );
              });
              it("mints a dynamic nft", async function () {
                  assert.equal(await dynamicSvgNft.getTokenCounter(), 1);
                  assert.equal(await dynamicSvgNft.ownerOf(tokenId), deployer);
              });
          });

          describe("tokenURI", function () {
              let highValue = ethers.utils.parseEther("3000");
              let tokenId, lowImageUri, highImageUri;
              beforeEach(async function () {
                  const tx = await dynamicSvgNft.mintNft(highValue);
                  const txResponse = await tx.wait(1);
                  tokenId = txResponse.events[1].args.tokenId;
                  lowImageUri = await dynamicSvgNft.getLowSVG();
                  highImageUri = await dynamicSvgNft.getHighSVG();
              });
              it("reverts if token id doesn not exist", async function () {
                  await expect(
                      dynamicSvgNft.tokenURI(tokenId + 1)
                  ).to.be.revertedWithCustomError(
                      dynamicSvgNft,
                      "ERC721Metadata__URI_QueryFor_NonExistentToken"
                  );
              });
              it("returns lowTokenURI for frown if price < highValue", async function () {
                  let newEthUsdPrice = highValue.sub(1);
                  await ethUsdPriceFeed.updateAnswer(newEthUsdPrice);
                  const tokenUriBase64 = await dynamicSvgNft.tokenURI(tokenId);
                  const tokenUriDecoded = atob(
                      tokenUriBase64.replace(
                          "data:application/json;base64,",
                          ""
                      )
                  );
                  //   assert.isTrue(tokenUriDecoded.includes(lowImageUri));

                  const tokenUriJSON = JSON.parse(tokenUriDecoded);
                  assert.equal(tokenUriJSON["image"], lowImageUri);
              });
              it("returns highTokenURI for happy if price >= highValue", async function () {
                  let newEthUsdPrice = highValue.add(1);
                  await ethUsdPriceFeed.updateAnswer(newEthUsdPrice);
                  const tokenUriBase64 = await dynamicSvgNft.tokenURI(tokenId);
                  const tokenUriDecoded = atob(
                      tokenUriBase64.replace(
                          "data:application/json;base64,",
                          ""
                      )
                  );
                  //   assert.isTrue(tokenUriDecoded.includes(highImageUri));

                  const tokenUriJSON = JSON.parse(tokenUriDecoded);
                  assert.equal(tokenUriJSON["image"], highImageUri);
              });
          });
      });
