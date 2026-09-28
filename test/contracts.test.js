import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import {
  BrowserProvider,
  ContractFactory,
  parseEther,
  ZeroAddress,
} from "ethers";
import { compile } from "../scripts/compile.js";

let rpc, connection, provider, owner, alice, bob, artifacts;
before(async () => {
  artifacts = compile();
  connection = await network.create("local");
  rpc = connection.provider;
  provider = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 });
  provider.pollingInterval = 10;
  [owner, alice, bob] = await Promise.all(
    [0, 1, 2].map((i) => provider.getSigner(i)),
  );
});
after(async () => {
  provider?.destroy();
  await connection?.close();
});
async function deploy(funds = "100000") {
  const token = await new ContractFactory(
    artifacts.EagleToken.abi,
    artifacts.EagleToken.bytecode,
    owner,
  ).deploy(await owner.getAddress());
  await token.waitForDeployment();
  const rewards = await new ContractFactory(
    artifacts.EagleRewards.abi,
    artifacts.EagleRewards.bytecode,
    owner,
  ).deploy(await token.getAddress(), await owner.getAddress());
  await rewards.waitForDeployment();
  if (funds !== "0")
    await (
      await token.transfer(await rewards.getAddress(), parseEther(funds))
    ).wait();
  return { token, rewards };
}
async function advance(seconds) {
  await rpc.request({ method: "evm_increaseTime", params: [seconds] });
  await rpc.request({ method: "evm_mine", params: [] });
}

test("fixed supply, metadata, and transfers; no public mint", async () => {
  const { token } = await deploy("0");
  assert.equal(await token.name(), "EAGLE i");
  assert.equal(await token.symbol(), "EAGLE");
  assert.equal(await token.decimals(), 18n);
  assert.equal(await token.totalSupply(), parseEther("1000000000"));
  assert.equal(
    await token.balanceOf(await owner.getAddress()),
    await token.totalSupply(),
  );
  assert.equal(token.interface.hasFunction("mint"), false);
  await (
    await token.transfer(await alice.getAddress(), parseEther("5"))
  ).wait();
  assert.equal(
    await token.balanceOf(await alice.getAddress()),
    parseEther("5"),
  );
  await assert.rejects(
    new ContractFactory(
      artifacts.EagleToken.abi,
      artifacts.EagleToken.bytecode,
      owner,
    ).deploy(ZeroAddress),
  );
});
test("reserves rewards, rejects early/duplicate claims, and pays correct account", async () => {
  const { token, rewards } = await deploy();
  await (await rewards.connect(alice).startSession()).wait();
  assert.equal(await rewards.reservedRewards(), parseEther("1200"));
  await assert.rejects(rewards.connect(alice).startSession.staticCall());
  await assert.rejects(rewards.connect(alice).claim.staticCall());
  await assert.rejects(rewards.connect(bob).claim.staticCall());
  await advance(86400);
  await (await rewards.connect(alice).claim()).wait();
  assert.equal(
    await token.balanceOf(await alice.getAddress()),
    parseEther("1200"),
  );
  assert.equal(await token.balanceOf(await bob.getAddress()), 0n);
  assert.equal(await rewards.reservedRewards(), 0n);
  await assert.rejects(rewards.connect(alice).claim.staticCall());
  await (await rewards.connect(alice).startSession()).wait();
});
test("funding cannot be overcommitted", async () => {
  const { rewards } = await deploy("1200");
  await (await rewards.connect(alice).startSession()).wait();
  await assert.rejects(rewards.connect(bob).startSession.staticCall());
  assert.equal(await rewards.reservedRewards(), parseEther("1200"));
});
test("membership payment, extension, session snapshot, multiplier and expiration", async () => {
  const { token, rewards } = await deploy();
  const user = rewards.connect(alice);
  await (await user.startSession()).wait();
  await assert.rejects(
    user.buyMembership.staticCall({ value: parseEther("0.009") }),
  );
  await assert.rejects(
    user.buyMembership.staticCall({ value: parseEther("0.011") }),
  );
  const balanceBefore = BigInt(
    await rpc.request({
      method: "eth_getBalance",
      params: [await owner.getAddress(), "latest"],
    }),
  );
  await (await user.buyMembership({ value: parseEther("0.01") })).wait();
  const balanceAfter = BigInt(
    await rpc.request({
      method: "eth_getBalance",
      params: [await owner.getAddress(), "latest"],
    }),
  );
  assert.equal(balanceAfter - balanceBefore, parseEther("0.01"));
  const expiry = await rewards.premiumUntil(await alice.getAddress());
  await (await user.buyMembership({ value: parseEther("0.01") })).wait();
  assert.equal(
    await rewards.premiumUntil(await alice.getAddress()),
    expiry + 30n * 86400n,
  );
  await advance(86400);
  await (await user.claim()).wait();
  assert.equal(
    await token.balanceOf(await alice.getAddress()),
    parseEther("1200"),
  );
  await (await user.startSession()).wait();
  assert.equal(
    (await rewards.sessions(await alice.getAddress())).reward,
    parseEther("3600"),
  );
  await advance(86400 * 61);
  await (await user.claim()).wait();
  assert.equal(
    await token.balanceOf(await alice.getAddress()),
    parseEther("4800"),
  );
  await (await user.startSession()).wait();
  assert.equal(
    (await rewards.sessions(await alice.getAddress())).reward,
    parseEther("1200"),
  );
});
