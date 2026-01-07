const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const tokenFactory = await ethers.getContractFactory("MockERC20");
  const token = await upgrades.deployProxy(
    tokenFactory,
    ["MockToken", "MTK", ethers.parseEther("1000000"), deployer.address],
    { initializer: "initialize", kind: "uups" }
  );
  await token.waitForDeployment();
  console.log("MockERC20 proxy:", await token.getAddress());

  const vaultFactory = await ethers.getContractFactory("TokenVaultV1");
  const depositFeeBps = 500; // 5%
  const vault = await upgrades.deployProxy(
    vaultFactory,
    [await token.getAddress(), deployer.address, depositFeeBps],
    { initializer: "initialize", kind: "uups" }
  );
  await vault.waitForDeployment();
  console.log("TokenVaultV1 proxy:", await vault.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
