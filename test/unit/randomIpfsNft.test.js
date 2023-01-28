const { network, deployments, getNamedAccounts, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft", function () {
          let deployer, randomIpfsNft, vrfCoordinatorV2Mock, mintFee
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract(
                  "RandomIpfsNft",
                  deployer
              )
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              )
              mintFee = await randomIpfsNft.getMintFee()
          })

          describe("requests an NFT", function () {
              it("fails if payment is not enough", async function () {
                  await expect(
                      randomIpfsNft.requestNft({ value: mintFee - 1 })
                  ).to.be.rejectedWith("RandomIpfsNft_NeedMoreETHSent")
              })
              it("fails if payment is not sent with the transaction", async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.rejectedWith(
                      "RandomIpfsNft_NeedMoreETHSent"
                  )
              })
              it("emits an event and sends a request for a random word", async function () {
                  await expect(
                      randomIpfsNft.requestNft({ value: mintFee })
                  ).to.emit(randomIpfsNft, "NftRequested")
              })
          })

          describe("fulfillRandomWords", function () {
              it("mints a random nft", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              const tokenId = (
                                  await randomIpfsNft.getTokenCounter()
                              ).sub(1)

                              assert.equal(
                                  await randomIpfsNft.ownerOf(tokenId),
                                  deployer
                              )
                              assert.equal(
                                  await randomIpfsNft.balanceOf(deployer),
                                  1
                              )
                              assert.equal(
                                  (await randomIpfsNft.tokenURI(tokenId))
                                      .toString()
                                      .includes("ipfs://"),
                                  true
                              )

                              resolve()
                          } catch (error) {
                              reject(error)
                          }
                      })

                      try {
                          const txResponse = await randomIpfsNft.requestNft({
                              value: mintFee.toString(),
                          })
                          const txReceipt = await txResponse.wait(1)

                          const requestId = txReceipt.events[1].args.requestId

                          const tx =
                              await vrfCoordinatorV2Mock.fulfillRandomWords(
                                  requestId,
                                  randomIpfsNft.address
                              )

                          await tx.wait(1)
                      } catch (error) {
                          console.log(error)
                      }
                  })
              })
          })

          describe("withdraw", function () {
              it("transfers all funds to owner", async function () {
                  const tx = await randomIpfsNft.requestNft({ value: mintFee })
                  await tx.wait(1)

                  const deployerBalanceBefore =
                      await ethers.provider.getBalance(deployer)

                  const txResponse = await randomIpfsNft.withdraw()
                  const txReceipt = await txResponse.wait(1)

                  const { gasUsed, effectiveGasPrice } = txReceipt

                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const deployerBalanceAfter = await ethers.provider.getBalance(
                      deployer
                  )
                  const contractBalanceAfterWithdraw =
                      await ethers.provider.getBalance(randomIpfsNft.address)

                  assert.isTrue(
                      deployerBalanceAfter.toString() >
                          deployerBalanceBefore.toString()
                  )
                  assert.equal(contractBalanceAfterWithdraw.toString(), 0)
              })
          })

          describe("getBreedFromModdedRng", function () {
              it("should return pug if random value < 10", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng("9")
                  assert.equal(breed, 0)
              })
              it("should return shiba inu if random value is between 10 and 39", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng("39")
                  assert.equal(breed, 1)
              })
              it("should return st. bernard if random value is between 40 and 99", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng("70")
                  assert.equal(breed, 2)
              })
          })
      })
