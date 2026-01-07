const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgrade V2 to V3", function () {
  let token, vaultV1, vaultV2, vaultV3, owner, user;

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

    const VaultV3 = await ethers.getContractFactory("TokenVaultV3");
    vaultV3 = await upgrades.upgradeProxy(await vaultV2.getAddress(), VaultV3, { kind: "uups" });
  });

  it("should preserve all V2 state after upgrade", async function () {
    expect(await vaultV3.balanceOf(user.address)).to.equal(ethers.parseEther("950"));
    expect(await vaultV3.totalDeposits()).to.equal(ethers.parseEther("950"));
  });

  it("should allow setting withdrawal delay", async function () {
    await vaultV3.connect(owner).setWithdrawalDelay(3600);
    expect(await vaultV3.getWithdrawalDelay()).to.equal(3600n);
  });

  it("should handle withdrawal requests correctly", async function () {
    await vaultV3.connect(owner).setWithdrawalDelay(0);
    await vaultV3.connect(user).requestWithdrawal(ethers.parseEther("100"));
    const [amount] = await vaultV3.getWithdrawalRequest(user.address);
    expect(amount).to.equal(ethers.parseEther("100"));
  });

  it("should enforce withdrawal delay", async function () {
    await vaultV3.connect(owner).setWithdrawalDelay(3600);
    await vaultV3.connect(user).requestWithdrawal(ethers.parseEther("100"));

    await expect(
      vaultV3.connect(user).executeWithdrawal()
    ).to.be.revertedWith("TokenVaultV3: delay not passed");

    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine");

    await vaultV3.connect(user).executeWithdrawal();
  });

  it("should allow emergency withdrawals", async function () {
    const before = await token.balanceOf(user.address);
    await vaultV3.connect(user).emergencyWithdraw();
    const after = await token.balanceOf(user.address);
    expect(after).to.be.gt(before);
  });

  it("should prevent premature withdrawal execution", async function () {
    await vaultV3.connect(owner).setWithdrawalDelay(3600);
    await vaultV3.connect(user).requestWithdrawal(ethers.parseEther("100"));
    await expect(
      vaultV3.connect(user).executeWithdrawal()
    ).to.be.revertedWith("TokenVaultV3: delay not passed");
  });
});
