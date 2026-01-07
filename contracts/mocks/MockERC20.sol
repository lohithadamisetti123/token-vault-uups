// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MockERC20 is Initializable, ERC20Upgradeable {
    function initialize(string memory name_, string memory symbol_, uint256 initialSupply, address to) public initializer {
        __ERC20_init(name_, symbol_);
        _mint(to, initialSupply);
    }
}
