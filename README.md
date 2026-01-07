# Token Vault UUPS

Upgradeable TokenVault system using the UUPS proxy pattern with three versions (V1 → V2 → V3).  
Implements secure initialization, role-based access control, storage gaps, and state-preserving upgrades. [page:1][web:25]

---

## Screenshots

- All tests passing (24/24). [file:45]  
- Solidity coverage summary for TokenVaultV1–V3 and MockERC20. [file:46]

---

## 1. Installation & Setup

From the project root:

```bash
npm install
```

Installs Hardhat, OpenZeppelin upgradeable contracts, the upgrades plugin, and test tooling. [web:25]

---

## 2. Compile & Test

Compile:

```bash
npx hardhat compile
```

Run the full test suite:

```bash
npx hardhat test
```

Tests cover V1 behaviour (fees, balances), V1→V2 and V2→V3 upgrades, withdrawal delays, emergency withdraw, and security properties (unauthorized upgrades, initialization, storage layout, selector clashes). [file:45][page:1]

Coverage (optional, but already configured):

```bash
npx hardhat coverage
```

Writes reports to `./coverage/` and `./coverage.json`. [file:46]

---
## Screenshots

- All tests passing:

  `screenshots/tests-passing.png`

- Coverage summary:

  `screenshots/coverage.png`

## 3. Deploy & Upgrade (local Hardhat)

Deploy V1:

```bash
npx hardhat run scripts/deploy-v1.js --network hardhat
```

- Deploys `MockERC20` and `TokenVaultV1` as UUPS proxies.
- Assigns `DEFAULT_ADMIN_ROLE`, `UPGRADER_ROLE`, `PAUSER_ROLE` to the deployer. [web:20][web:12]

Upgrade to V2:

```bash
VAULT_PROXY=<vault_proxy_address> npx hardhat run scripts/upgrade-to-v2.js --network hardhat
```

Upgrade to V3:

```bash
VAULT_PROXY=<vault_proxy_address> npx hardhat run scripts/upgrade-to-v3.js --network hardhat
```

Both upgrades preserve user balances, total deposits, and role assignments. [page:1]

---

## 4. Design Summary

**Storage layout**

- V1: core state (`_token`, `_admin`, `_depositFeeBasisPoints`, `_totalDeposits`, `_balances`) + `uint256[45]` gap.
- V2: adds `_yieldRateBasisPoints`, `_lastClaimTime`, `_depositsPaused`, reduces gap to `uint256[42]`.
- V3: adds `_withdrawalDelay`, `_withdrawals`, reduces gap to `uint256[40]`.
- No reordering or type changes; security tests assert no layout collisions. [web:28][web:34]

**Access control**

- `DEFAULT_ADMIN_ROLE`: grants/revokes all roles.
- `UPGRADER_ROLE`: required by `_authorizeUpgrade` for UUPS upgrades.
- `PAUSER_ROLE`: used in V2+ to pause/unpause deposits.
- MockERC20 also uses `DEFAULT_ADMIN_ROLE` + `UPGRADER_ROLE` to be upgrade-safe. [web:19][web:25]

**Business logic**

- V1: deposit/withdraw with fee in bps, fee deducted before crediting user.
- V2: time-based yield using  
  \(\text{yield} = \frac{\text{balance} \times \text{yieldRate} \times \text{timeElapsed}}{365\ \text{days} \times 10000}\) (simple interest, no auto-compound). [web:25]
- V3: withdrawal delay with `requestWithdrawal` / `executeWithdrawal`, plus `emergencyWithdraw` that bypasses delay but preserves invariants. [page:1]

**Initialization & UUPS safety**

- All logic contracts use `initializer` instead of constructors and call `_disableInitializers()` in constructors.
- Upgrades go through `UUPSUpgradeable` with `_authorizeUpgrade` protected by `UPGRADER_ROLE`.
- Security tests ensure implementation contracts cannot be initialized directly and unauthorized upgrades revert. [web:24][web:28]
```

***
