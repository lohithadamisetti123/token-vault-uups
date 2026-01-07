const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = process.env.VAULT_PROXY;
  if (!proxyAddress) throw new Error("VAULT_PROXY env var required");

  const V3 = await ethers.getContractFactory("TokenVaultV3");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, V3, { kind: "uups" });
  await upgraded.waitForDeployment();
  console.log("Upgraded to V3 at:", await upgraded.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
