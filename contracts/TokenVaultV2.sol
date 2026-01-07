// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TokenVaultV1.sol";

contract TokenVaultV2 is TokenVaultV1 {
    // New state variables appended AFTER V1 layout
    uint256 internal _yieldRateBasisPoints; // in bps
    mapping(address => uint256) internal _lastClaimTime;
    bool internal _depositsPaused;

    // Reduce gap: V1 had [45]; we added 2 slots (yieldRate, depositsPaused) + mapping (1 slot) => 3
    uint256[42] private __gapV2;

    event YieldRateUpdated(uint256 newRate);
    event YieldClaimed(address indexed user, uint256 amount);
    event DepositsPaused(address indexed by);
    event DepositsUnpaused(address indexed by);

    function setYieldRate(uint256 _yieldRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _yieldRateBasisPoints = _yieldRate;
        emit YieldRateUpdated(_yieldRate);
    }

    function getYieldRate() external view returns (uint256) {
        return _yieldRateBasisPoints;
    }

    function _pendingYield(address user) internal view returns (uint256) {
        uint256 bal = _balances[user];
        if (bal == 0 || _yieldRateBasisPoints == 0) return 0;

        uint256 last = _lastClaimTime[user];
        if (last == 0) return 0;

        uint256 elapsed = block.timestamp - last;
        // Yield = (balance * rate * time) / (365 days * 10000)
        uint256 numerator = bal * _yieldRateBasisPoints * elapsed;
        uint256 denominator = 365 days * 10000;
        return numerator / denominator;
    }

    function getUserYield(address user) external view returns (uint256) {
        return _pendingYield(user);
    }

    function claimYield() external returns (uint256) {
        uint256 last = _lastClaimTime[msg.sender];
        if (last == 0) {
            _lastClaimTime[msg.sender] = block.timestamp;
            return 0;
        }

        uint256 amount = _pendingYield(msg.sender);
        if (amount > 0) {
            require(_token.transfer(msg.sender, amount), "TokenVaultV2: transfer failed");
        }
        _lastClaimTime[msg.sender] = block.timestamp;

        emit YieldClaimed(msg.sender, amount);
        return amount;
    }

    function pauseDeposits() external onlyRole(PAUSER_ROLE) {
        _depositsPaused = true;
        emit DepositsPaused(msg.sender);
    }

    function unpauseDeposits() external onlyRole(PAUSER_ROLE) {
        _depositsPaused = false;
        emit DepositsUnpaused(msg.sender);
    }

    function isDepositsPaused() external view returns (bool) {
        return _depositsPaused;
    }

    function deposit(uint256 amount) public override {
        require(!_depositsPaused, "TokenVaultV2: deposits paused");
        if (_lastClaimTime[msg.sender] == 0) {
            _lastClaimTime[msg.sender] = block.timestamp;
        }
        super.deposit(amount);
    }

    function getImplementationVersion() external pure returns (string memory) {
        return "V2";
    }
}
