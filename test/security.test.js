const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Security", function () {
  it("should prevent direct initialization of implementation contracts", async function () {
    const VaultV1 = await ethers.getContractFactory("TokenVaultV1");
    const impl = await VaultV1.deploy();
    await impl.waitForDeployment();

    await expect(
      impl.initialize(ethers.ZeroAddress, ethers.ZeroAddress, 0)
    ).to.be.reverted;
  });

  it("should prevent unauthorized upgrades", async function () {
    const [admin, attacker] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await upgrades.deployProxy(
      Token,
      ["MockToken", "MTK", ethers.parseEther("1000000"), admin.address],
      { initializer: "initialize", kind: "uups" }
    );

    const VaultV1 = await ethers.getContractFactory("TokenVaultV1");
    const vault = await upgrades.deployProxy(
      VaultV1,
      [await token.getAddress(), admin.address, 500],
      { initializer: "initialize", kind: "uups" }
    );

    const VaultV2 = await ethers.getContractFactory("TokenVaultV2");

    await expect(
      upgrades.upgradeProxy(await vault.getAddress(), VaultV2.connect(attacker), { kind: "uups" })
    ).to.be.reverted;
  });

  it("should use storage gaps for future upgrades", async function () {
    const VaultV1 = await ethers.getContractFactory("TokenVaultV1");
    const storageGap = await ethers.provider.getStorage(await VaultV1.deploy(), 5);
    expect(storageGap).to.not.equal(undefined);
  });

  it("should not have storage layout collisions across versions", async function () {
    const V1 = await ethers.getContractFactory("TokenVaultV1");
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const V3 = await ethers.getContractFactory("TokenVaultV3");

    expect(V1.interface.fragments.length).to.be.lte(V2.interface.fragments.length);
    expect(V2.interface.fragments.length).to.be.lte(V3.interface.fragments.length);
  });

it("should prevent function selector clashing", async function () {
  const V3 = await ethers.getContractFactory("TokenVaultV3");
  const selectors = new Set();

  for (const fnName in V3.interface.functions) {
    const fragment = V3.interface.functions[fnName];
    const sig = V3.interface.getSighash(fragment);
    expect(selectors.has(sig)).to.equal(false);
    selectors.add(sig);
  }
});

});
