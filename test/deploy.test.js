import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { network } from "hardhat";
import { Wallet, JsonRpcProvider, Contract, parseEther } from "ethers";
import { root } from "../scripts/compile.js";

const exec = promisify(execFile);
test("deployment script deploys and funds a local chain 97; refuses chain 56", async () => {
  for (const chainId of [97, 56]) {
    const server = await network.createServer(
      { network: "local", override: { chainId } },
      "127.0.0.1",
      0,
    );
    const { port } = await server.listen();
    const provider = new JsonRpcProvider(`http://127.0.0.1:${port}`);
    const wallet = Wallet.createRandom();
    await provider.send("hardhat_setBalance", [
      wallet.address,
      "0x56BC75E2D63100000",
    ]);
    const env = {
      ...process.env,
      BNB_TESTNET_RPC_URL: `http://127.0.0.1:${port}`,
      DEPLOYER_PRIVATE_KEY: wallet.privateKey,
      CONFIRM_TESTNET_DEPLOY: "yes",
    };
    let deploymentPath;
    try {
      if (chainId === 56) {
        await assert.rejects(
          exec(process.execPath, ["scripts/deploy.js"], {
            cwd: root,
            env,
            timeout: 30000,
          }),
          (error) =>
            error.stderr.includes("restricted to BNB Smart Chain Testnet"),
        );
        assert.equal(await provider.getTransactionCount(wallet.address), 0);
      } else {
        const { stdout } = await exec(process.execPath, ["scripts/deploy.js"], {
          cwd: root,
          env,
          timeout: 30000,
        });
        deploymentPath = stdout.match(/Deployment saved: (.+)/)?.[1].trim();
        assert.ok(deploymentPath);
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        assert.equal(deployment.treasury, wallet.address);
        assert.equal(deployment.fundedRewards, "100000000");
        const token = new Contract(
          deployment.token,
          ["function balanceOf(address) view returns(uint256)"],
          provider,
        );
        assert.equal(
          await token.balanceOf(deployment.rewards),
          parseEther("100000000"),
        );
        assert.equal(
          await token.balanceOf(wallet.address),
          parseEther("900000000"),
        );
        assert.notEqual(await provider.getCode(deployment.rewards), "0x");
      }
    } finally {
      // Remove all local simulation records, including partial deployment failures.
      const artifacts = path.join(root, "artifacts");
      for (const name of fs.existsSync(artifacts)
        ? fs.readdirSync(artifacts)
        : []) {
        if (!name.startsWith("deployment-97-")) continue;
        const file = path.join(artifacts, name);
        if (
          JSON.parse(fs.readFileSync(file, "utf8")).treasury === wallet.address
        )
          fs.unlinkSync(file);
      }
      provider.destroy();
      await server.close();
    }
  }
});
