// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TokenVault V1 - UUPS upgradeable token vault with deposit fee
/// @notice Implements basic deposit / withdraw with fee and AccessControl for upgrades
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract TokenVaultV1 is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); // used in V2+

    ERC20Upgradeable internal _token;
    address internal _admin;
    uint256 internal _depositFeeBasisPoints; // fee in bps (out of 10000)
    uint256 internal _totalDeposits;
    mapping(address => uint256) internal _balances;

    // storage gap for future variables
    uint256[45] private __gap; // adjusted later in V2/V3

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize implementation via proxy
    /// @param _tokenAddr ERC20 token address
    /// @param _adminAddr admin address for roles
    /// @param _depositFee fee in basis points (max 10000)
    function initialize(
        address _tokenAddr,
        address _adminAddr,
        uint256 _depositFee
    ) external initializer {
        require(_tokenAddr != address(0), "TokenVaultV1: token is zero");
        require(_adminAddr != address(0), "TokenVaultV1: admin is zero");
        require(_depositFee <= 10000, "TokenVaultV1: invalid fee");

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _token = ERC20Upgradeable(_tokenAddr);
        _admin = _adminAddr;
        _depositFeeBasisPoints = _depositFee;

        _grantRole(DEFAULT_ADMIN_ROLE, _adminAddr);
        _grantRole(UPGRADER_ROLE, _adminAddr);
        _grantRole(PAUSER_ROLE, _adminAddr);
    }

    /// @notice Deposit tokens (fee taken from amount)
   function deposit(uint256 amount) external virtual {
    require(amount > 0, "TokenVaultV1: amount is zero");

    uint256 fee = (amount * _depositFeeBasisPoints) / 10000;
    uint256 netAmount = amount - fee;

    require(
        _token.transferFrom(msg.sender, address(this), amount),
        "TokenVaultV1: transfer failed"
    );

    _balances[msg.sender] += netAmount;
    _totalDeposits += netAmount;
}

    /// @notice Withdraw tokens up to balance
    function withdraw(uint256 amount) external virtual {
        require(amount > 0, "TokenVaultV1: amount is zero");
        uint256 bal = _balances[msg.sender];
        require(amount <= bal, "TokenVaultV1: insufficient balance");

        _balances[msg.sender] = bal - amount;
        _totalDeposits -= amount;

        require(_token.transfer(msg.sender, amount), "TokenVaultV1: transfer failed");
    }

    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    function totalDeposits() external view returns (uint256) {
        return _totalDeposits;
    }

    function getDepositFee() external view returns (uint256) {
        return _depositFeeBasisPoints;
    }

    function getImplementationVersion() external pure virtual returns (string memory) {
        return "V1";
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {
        // AccessControl handles auth
    }
}
