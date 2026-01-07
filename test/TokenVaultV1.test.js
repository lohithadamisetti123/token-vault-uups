const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("TokenVaultV1", function () {
  let token, vault, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await upgrades.deployProxy(
      Token,
      ["MockToken", "MTK", ethers.parseEther("1000000"), owner.address],
      { initializer: "initialize", kind: "uups" }
    );

    const Vault = await ethers.getContractFactory("TokenVaultV1");
    vault = await upgrades.deployProxy(
      Vault,
      [await token.getAddress(), owner.address, 500],
      { initializer: "initialize", kind: "uups" }
    );
  });

  it("should initialize with correct parameters", async function () {
    expect(await vault.getDepositFee()).to.equal(500n);
    expect(await vault.getImplementationVersion()).to.equal("V1");
  });

  it("should allow deposits and update balances", async function () {
    await token.transfer(user.address, ethers.parseEther("1000"));
    await token.connect(user).approve(await vault.getAddress(), ethers.parseEther("1000"));

    await vault.connect(user).deposit(ethers.parseEther("1000"));
    const bal = await vault.balanceOf(user.address);
    expect(bal).to.equal(ethers.parseEther("950"));
    expect(await vault.totalDeposits()).to.equal(ethers.parseEther("950"));
  });

  it("should deduct deposit fee correctly", async function () {
    await token.transfer(user.address, ethers.parseEther("1000"));
    await token.connect(user).approve(await vault.getAddress(), ethers.parseEther("1000"));

    await vault.connect(user).deposit(ethers.parseEther("1000"));
    const bal = await vault.balanceOf(user.address);
    expect(bal).to.equal(ethers.parseEther("950"));
  });

  it("should allow withdrawals and update balances", async function () {
    await token.transfer(user.address, ethers.parseEther("1000"));
    await token.connect(user).approve(await vault.getAddress(), ethers.parseEther("1000"));
    await vault.connect(user).deposit(ethers.parseEther("1000"));

    await vault.connect(user).withdraw(ethers.parseEther("100"));
    expect(await vault.balanceOf(user.address)).to.equal(ethers.parseEther("850"));
    expect(await vault.totalDeposits()).to.equal(ethers.parseEther("850"));
  });

  it("should prevent withdrawal of more than balance", async function () {
    await token.transfer(user.address, ethers.parseEther("1000"));
    await token.connect(user).approve(await vault.getAddress(), ethers.parseEther("1000"));
    await vault.connect(user).deposit(ethers.parseEther("1000"));

    await expect(
      vault.connect(user).withdraw(ethers.parseEther("960"))
    ).to.be.revertedWith("TokenVaultV1: insufficient balance");
  });

  it("should prevent reinitialization", async function () {
    await expect(
      vault.initialize(await token.getAddress(), owner.address, 100)
    ).to.be.reverted;
  });
});
