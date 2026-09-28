// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply EAGLE i token for BNB Smart Chain.
contract EagleToken is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10 ** 18;
    error InvalidTreasury();

    constructor(address treasury) ERC20("EAGLE i", "EAGLE") {
        if (treasury == address(0)) revert InvalidTreasury();
        _mint(treasury, INITIAL_SUPPLY);
    }
}
