const { network, ethers, deployments, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNft", function () {
          let basicNft, deployer
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              basicNft = await ethers.getContract("BasicNft", deployer)
          })

          describe("constructor", function () {
              it("initializes correctly", async function () {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()

                  assert.equal(name, "Dogie")
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenCounter, "0")
              })
          })

          describe("mintNFT", function () {
              let initialBalance, tokenCounter
              beforeEach(async function () {
                  initialBalance = await basicNft.balanceOf(deployer)
                  tokenCounter = await basicNft.getTokenCounter()
                  const tx = await basicNft.mintNFT()
                  await tx.wait()
              })
              it("mints an nft and assigns tokenId to owner", async function () {
                  const balance = await basicNft.balanceOf(deployer)
                  const newTokenCounter = await basicNft.getTokenCounter()
                  const owner = await basicNft.ownerOf(tokenCounter)
                  assert.equal(
                      balance.toString(),
                      initialBalance.add(1).toString()
                  )
                  assert.equal(
                      newTokenCounter.toString(),
                      tokenCounter.add(1).toString()
                  )
                  assert.equal(owner.toString(), deployer)
              })
          })
      })
