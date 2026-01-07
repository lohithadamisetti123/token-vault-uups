// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TokenVaultV2.sol";

contract TokenVaultV3 is TokenVaultV2 {
    struct WithdrawalRequest {
        uint256 amount;
        uint256 requestTime;
    }

    uint256 internal _withdrawalDelay;
    mapping(address => WithdrawalRequest) internal _withdrawals;

    // Reduce gap: V2 had [42]; we add 1 uint256 + mapping => 2 slots
    uint256[40] private __gapV3;

    event WithdrawalRequested(address indexed user, uint256 amount, uint256 when);
    event WithdrawalExecuted(address indexed user, uint256 amount);
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    event WithdrawalDelayUpdated(uint256 newDelay);

    function setWithdrawalDelay(uint256 _delaySeconds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _withdrawalDelay = _delaySeconds;
        emit WithdrawalDelayUpdated(_delaySeconds);
    }

    function getWithdrawalDelay() external view returns (uint256) {
        return _withdrawalDelay;
    }

    function getWithdrawalRequest(address user) external view returns (uint256 amount, uint256 requestTime) {
        WithdrawalRequest memory r = _withdrawals[user];
        return (r.amount, r.requestTime);
    }

    function requestWithdrawal(uint256 amount) external {
        require(amount > 0, "TokenVaultV3: amount is zero");
        require(amount <= _balances[msg.sender], "TokenVaultV3: insufficient balance");

        _withdrawals[msg.sender] = WithdrawalRequest({
            amount: amount,
            requestTime: block.timestamp
        });

        emit WithdrawalRequested(msg.sender, amount, block.timestamp);
    }

    function executeWithdrawal() external returns (uint256) {
        WithdrawalRequest memory r = _withdrawals[msg.sender];
        require(r.amount > 0, "TokenVaultV3: no request");
        require(block.timestamp >= r.requestTime + _withdrawalDelay, "TokenVaultV3: delay not passed");

        uint256 amount = r.amount;
        require(amount <= _balances[msg.sender], "TokenVaultV3: insufficient balance");

        _balances[msg.sender] -= amount;
        _totalDeposits -= amount;
        delete _withdrawals[msg.sender];

        require(_token.transfer(msg.sender, amount), "TokenVaultV3: transfer failed");
        emit WithdrawalExecuted(msg.sender, amount);
        return amount;
    }

    function emergencyWithdraw() external returns (uint256) {
        uint256 bal = _balances[msg.sender];
        require(bal > 0, "TokenVaultV3: no balance");

        _balances[msg.sender] = 0;
        _totalDeposits -= bal;
        delete _withdrawals[msg.sender];

        require(_token.transfer(msg.sender, bal), "TokenVaultV3: transfer failed");
        emit EmergencyWithdrawal(msg.sender, bal);
        return bal;
    }

    function getImplementationVersion() external pure returns (string memory) {
        return "V3";
    }
}
