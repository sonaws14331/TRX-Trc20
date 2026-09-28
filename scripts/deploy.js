import fs from "node:fs";
import path from "node:path";
import {
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  NonceManager,
  parseEther,
} from "ethers";
import { compile, root } from "./compile.js";

if (!process.env.BNB_TESTNET_RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY) {
  throw new Error(
    "Set BNB_TESTNET_RPC_URL and DEPLOYER_PRIVATE_KEY in a private .env file. Use a dedicated testnet wallet.",
  );
}
if (process.env.CONFIRM_TESTNET_DEPLOY !== "yes")
  throw new Error(
    "Set CONFIRM_TESTNET_DEPLOY=yes only when ready to spend test BNB.",
  );
const provider = new JsonRpcProvider(process.env.BNB_TESTNET_RPC_URL);
try {
  if ((await provider.getNetwork()).chainId !== 97n)
    throw new Error(
      "Deployment is restricted to BNB Smart Chain Testnet (chain ID 97).",
    );
  const wallet = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const signer = new NonceManager(wallet);
  const contracts = compile();
  fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
  const deploymentPath = path.join(
    root,
    "artifacts",
    `deployment-97-${Date.now()}.json`,
  );
  const deployment = {
    chainId: 97,
    treasury: wallet.address,
    token: null,
    rewards: null,
    fundedRewards: "0",
  };
  const save = () =>
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("Deploying on BNB testnet. Treasury:", wallet.address);
  const token = await new ContractFactory(
    contracts.EagleToken.abi,
    contracts.EagleToken.bytecode,
    signer,
  ).deploy(wallet.address);
  await token.waitForDeployment();
  deployment.token = await token.getAddress();
  save();
  console.log("EAGLE token:", deployment.token);
  const rewards = await new ContractFactory(
    contracts.EagleRewards.abi,
    contracts.EagleRewards.bytecode,
    signer,
  ).deploy(deployment.token, wallet.address);
  await rewards.waitForDeployment();
  deployment.rewards = await rewards.getAddress();
  save();
  console.log("Rewards:", deployment.rewards);
  await (
    await token.transfer(deployment.rewards, parseEther("100000000"))
  ).wait();
  deployment.fundedRewards = "100000000";
  save();
  console.log(
    "Funded 100,000,000 EAGLE in testnet rewards. Deployment saved:",
    deploymentPath,
  );
} finally {
  provider.destroy();
}
