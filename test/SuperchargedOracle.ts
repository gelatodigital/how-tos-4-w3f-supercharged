import hre from "hardhat";
import { expect } from "chai";
import {  SuperchargedOracle } from "../typechain";
import { before } from "mocha";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  Web3FunctionUserArgs,
  Web3FunctionResultV2,
  Web3FunctionFailContext,
  Web3FunctionSuccessContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
const { ethers, deployments, w3f } = hre;

describe("SimpleCounter Tests", function () {
  this.timeout(0);

  let owner: SignerWithAddress;

  let oracle: SuperchargedOracle;
  let simpleW3f: Web3FunctionHardhat;
  let userArgs: Web3FunctionUserArgs;

  before(async function () {
    await deployments.fixture();

    [owner] = await hre.ethers.getSigners();

    oracle = await ethers.getContract("SuperchargedOracle");
    simpleW3f = w3f.get("simple");

    userArgs = {
      currency: "ethereum",
      oracle: oracle.address,
    };
  });

  it("canExec: true - First execution", async () => {
    let { result, storage } = await simpleW3f.run("onRun", { userArgs });
    result = result as Web3FunctionResultV2;
    console.log(storage);
    if (result.canExec == true) {
      if (+storage.storage.lastRand! > 0.5) {
        const calldataPrice = result.callData[0];
        await owner.sendTransaction({
          to: calldataPrice.to,
          data: calldataPrice.data,
        });

        const price = await oracle.price();
        console.log("> Price in contract: " + price.toString());
        expect(price).to.gt(0);
      } else {
        const calldataPrice = result.callData[0];

        await expect (owner.sendTransaction({
          to: calldataPrice.to,
          data: calldataPrice.data,
        })).to.revertedWith(`Error Revert Price`);
        console.log(`> Reverted nicely rand=${+storage.storage.lastRand!} `);

       }

    } 
  });
});
