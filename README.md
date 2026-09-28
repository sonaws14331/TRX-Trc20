# EAGLE i

A responsive memecoin dashboard and fixed-supply token for BNB Smart Chain. The interface includes mining-style participation rewards, Explorer and Eagle Elite memberships, a wallet address connection, and local activity history.

## Run the app

Requires Node.js 24+ (verified on Node 24) and npm.

```sh
npm ci
npm run dev -- --port 5173
```

Open http://localhost:5173. Production build: `npm run build`. Preview that build: `npm run preview -- --port 4173`.

## What works in the preview

- Start a 30-second demo session, claim 1,200 demo EAGLE, and start another session.
- Activate a free demo Elite membership for 3,600 EAGLE per new session, valid for 30 days.
- See your balance, filter activity, reload to restore progress, and reset from the Interactive demo dialog.
- Connect an injected EIP-1193 browser wallet on BNB mainnet or testnet to display its address. Account/network changes clear the connection.
- Keyboard-accessible dialogs and responsive desktop/mobile layouts.

**The UI runs entirely in demo mode.** It does not call the contracts, read live token balances, request signatures, buy real membership, or transfer tokens. Connecting a wallet does not change that. Demo data is stored in this browser, is editable by its user, and has no monetary value. The device performs no proof-of-work mining.

## Provisional token design

| Setting                                       | Value                                      |
| --------------------------------------------- | ------------------------------------------ |
| Name / symbol                                 | EAGLE i / EAGLE                            |
| Chain                                         | BNB Smart Chain (BEP-20-compatible ERC-20) |
| Supply                                        | Fixed 1,000,000,000; 18 decimals           |
| Mint recipient                                | Treasury selected at deployment            |
| Additional minting, transfer fees, blacklists | None                                       |
| Testnet deployment rewards allocation         | 100,000,000 EAGLE (10%)                    |
| Remaining testnet treasury allocation         | 900,000,000 EAGLE (90%)                    |
| Base session reward                           | 1,200 EAGLE per 24-hour session            |
| Elite session reward                          | 3,600 EAGLE per 24-hour session            |
| Elite membership                              | 0.01 BNB / 30 days; manual renewal         |

These are editable starting parameters, not an announced token launch. No contracts have been deployed, no market price exists, and no liquidity or exchange listing is included.

## Contracts

`contracts/EagleToken.sol` uses OpenZeppelin ERC20 and mints the entire supply once. `contracts/EagleRewards.sol` holds pre-funded EAGLE, reserves a session's complete reward at the start, and allows its owner address to claim after 24 hours. A session's reward does not change after upgrading or after membership expires. There is no automatic next session. Membership purchases extend existing unexpired membership and forward the exact BNB payment to the immutable treasury. There is no automatic billing, cancellation, or refund mechanism in the contract.

The rewards contract is permissionless **per address**, with no identity verification or Sybil resistance. A person can use many addresses to reserve or consume rewards. Unclaimed sessions keep their tokens reserved indefinitely. There is no reward withdrawal or recovery function, administrator, rate change, or upgrade mechanism. Reward tokens stop being available for new sessions when unreserved funding is exhausted. Tokens sent accidentally to these contracts may be unrecoverable. These choices need a product decision before a public launch; the current design is for testnet exploration. The contracts have local automated tests, not an independent security audit.

## Validate

```sh
npm test
npm run compile:contracts
npm run build
```

Tests execute contracts on a local Hardhat EVM with synthetic funded wallets. They cover supply, transfers, reward reservations, correct claim recipients, early/duplicate claim rejection, premium payment/extension/expiry, and rate snapshots. Demo-state tests cover timing, duplicate actions, premium expiry, and storage recovery. Deployment integration checks deploy and fund both contracts on a local chain 97 and verify that chain 56 is rejected without sending transactions.

## Deploy to BNB testnet

1. Use a dedicated testnet wallet with test BNB and a BNB Smart Chain Testnet RPC endpoint.
2. Copy `.env.example` to `.env` and fill `BNB_TESTNET_RPC_URL` and `DEPLOYER_PRIVATE_KEY` privately. Never use a `VITE_` prefix for a secret: Vite exposes those values to browsers.
3. Set `CONFIRM_TESTNET_DEPLOY=yes` when ready to spend test BNB.
4. Run `npm run deploy:testnet`.

The script refuses any chain ID other than **97**, compiles both contracts, deploys with the deployer as treasury, and funds rewards with 100 million EAGLE. Deployment addresses are saved incrementally in `artifacts/deployment-97-<timestamp>.json`. Transactions are not atomic: if a later transaction fails, earlier deployments remain. Check the saved addresses before rerunning; a rerun creates new contracts. Save deployment records outside this disposable workspace.

The app is not wired to deployments. A live release still needs contract address configuration, transaction flows, receipt handling, on-chain state reads, and decisions about distribution and abuse prevention. No mainnet deployment command is provided.

## References

- [BNB Chain network configuration](https://docs.bnbchain.org/bnb-smart-chain/developers/wallet-configuration/)
- [OpenZeppelin: creating ERC-20 supply](https://docs.openzeppelin.com/contracts/5.x/erc20-supply)

## Project structure

- `src/` — React UI, responsive styling, local demo state.
- `contracts/` — Token and participation/membership contracts.
- `scripts/` — Solidity compilation and explicit testnet deployment.
- `test/` — Demo-state and local EVM tests.
