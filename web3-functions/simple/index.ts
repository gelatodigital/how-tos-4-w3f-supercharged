import {
  Web3Function,
  Web3FunctionContext,
  Web3FunctionFailContext,
  Web3FunctionSuccessContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract } from "ethers";
import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default
import { SendmailOptions, sendmail } from "./utils";

const SIMPLE_COUNTER_ABI = [
  "function updatePriceRevert(uint256)",
  "function updatePrice(uint256)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, multiChainProvider, storage } = context;

  // Multichain Provider
  const provider = multiChainProvider.default();
  const providerBlackberry = multiChainProvider.chainId(94204209);

  // User Args
  const oracleAddress =
    (userArgs.oracle as string) ?? "0x454ee707F0e0745b2579D715F3B796B980aF272";
  let oracle = new Contract(oracleAddress, SIMPLE_COUNTER_ABI, provider);

  // User Storage
  const lastPrice = +((await storage.get("lastPrice")) ?? "0");

  // Get current price on coingecko
  const currency = (userArgs.currency as string) ?? "ethereum";
  let price = 0;
  try {
    const coingeckoApi = `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=usd`;

    const priceData: { [key: string]: { usd: number } } = await ky
      .get(coingeckoApi, { timeout: 5_000, retry: 0 })
      .json();
    price = Math.floor(priceData[currency].usd);
    await storage.set("lastPrice", price.toString());
  } catch (err) {
    return { canExec: false, message: `Coingecko call failed` };
  }
  console.log(`Updating price: ${price}`);

  // Return execution call data

  if (lastPrice != 0 && lastPrice < price) {
    return {
      canExec: false,
      message: "Price is below",
    };
  } else {
    const rand = Math.random();
    await storage.set("lastRand", rand.toString());
    console.log(rand);
    let data =
      rand > 0.5
        ? oracle.interface.encodeFunctionData("updatePrice", [price])
        : oracle.interface.encodeFunctionData("updatePriceRevert", [price]);
    return {
      canExec: true,
      callData: [
        {
          to: oracleAddress,
          data: data,
        },
      ],
    };
  }
});

//Web3 Function onSuccess callback
Web3Function.onSuccess(async (context: Web3FunctionSuccessContext) => {
  const { transactionHash } = context;
  console.log("onSuccess: txHash: ", transactionHash);
});

//Web3 Function onFail callback
Web3Function.onFail(async (context: Web3FunctionFailContext) => {
  const { userArgs, reason, secrets } = context;

  const apikey = (await secrets.get("SENGRID_API")) as string;
  const from = (await secrets.get("FROM_EMAIL")) as string;
  const to = (await secrets.get("TO_EMAIL")) as string;

  let alertMessage = `Web3 Function Failed. Reason: ${reason}`;
  console.log("userArgs: ", userArgs.canExec);

  if (reason === "ExecutionReverted") {
    alertMessage += ` TxHash: ${context.transactionHash}`;
    console.log(`onFail: ${reason} txHash: ${context.transactionHash}`);
  } else if (reason === "SimulationFailed") {
    alertMessage += ` callData: ${JSON.stringify(context.callData)}`;
    console.log(
      `onFail: ${reason} callData: ${JSON.stringify(context.callData)}`
    );
  } else {
    console.log(`onFail: ${reason}`);
  }

  const mailOptions: SendmailOptions = {
    apikey: apikey,
    from: from,
    to: to,
    subject: "Web3 Function Execution Failure",
    text: alertMessage,
  };
  if (apikey == "test") {
    console.log("sending email....")
  } else {
    await sendmail(mailOptions);
  }
});
