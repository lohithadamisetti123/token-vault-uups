const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgrade V1 to V2", function () {
  let token, vaultV1, vaultV2, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await upgrades.deployProxy(
      Token,
      ["MockToken", "MTK", ethers.parseEther("1000000"), owner.address],
      { initializer: "initialize", kind: "uups" }
    );

    const VaultV1 = await ethers.getContractFactory("TokenVaultV1");
    vaultV1 = await upgrades.deployProxy(
      VaultV1,
      [await token.getAddress(), owner.address, 500],
      { initializer: "initialize", kind: "uups" }
    );

    await token.transfer(user.address, ethers.parseEther("1000"));
    await token.connect(user).approve(await vaultV1.getAddress(), ethers.parseEther("1000"));
    await vaultV1.connect(user).deposit(ethers.parseEther("1000"));

    const VaultV2 = await ethers.getContractFactory("TokenVaultV2");
    vaultV2 = await upgrades.upgradeProxy(await vaultV1.getAddress(), VaultV2, { kind: "uups" });
  });

  it("should preserve user balances after upgrade", async function () {
    expect(await vaultV2.balanceOf(user.address)).to.equal(ethers.parseEther("950"));
  });

  it("should preserve total deposits after upgrade", async function () {
    expect(await vaultV2.totalDeposits()).to.equal(ethers.parseEther("950"));
  });

  it("should maintain admin access control after upgrade", async function () {
    const DEFAULT_ADMIN_ROLE = await vaultV2.DEFAULT_ADMIN_ROLE();
    expect(await vaultV2.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
  });

  it("should allow setting yield rate in V2", async function () {
    await vaultV2.connect(owner).setYieldRate(500);
    expect(await vaultV2.getYieldRate()).to.equal(500n);
  });

  it("should calculate yield correctly", async function () {
    await vaultV2.connect(owner).setYieldRate(500);
    await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    const before = await token.balanceOf(user.address);
    const claimed = await vaultV2.connect(user).claimYield();
    const tx = await claimed.wait();
    const event = tx.logs.find(() => true); // placeholder

    const after = await token.balanceOf(user.address);
    expect(after).to.be.gt(before);
  });

  it("should prevent non-admin from setting yield rate", async function () {
    await expect(
      vaultV2.connect(user).setYieldRate(500)
    ).to.be.reverted;
  });

  it("should allow pausing deposits in V2", async function () {
    await vaultV2.connect(owner).pauseDeposits();
    expect(await vaultV2.isDepositsPaused()).to.equal(true);
    await expect(
      vaultV2.connect(user).deposit(ethers.parseEther("1"))
    ).to.be.revertedWith("TokenVaultV2: deposits paused");
  });
});
