// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Participation rewards, not proof-of-work mining. One session per address.
/// @dev Permissionless addresses are not unique people. No Sybil resistance is provided.
contract EagleRewards is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant SESSION_DURATION = 1 days;
    uint256 public constant MEMBERSHIP_DURATION = 30 days;
    uint256 public constant BASE_REWARD = 1_200 ether;
    uint256 public constant ELITE_REWARD = 3_600 ether;
    uint256 public constant MEMBERSHIP_PRICE = 0.01 ether;
    IERC20 public immutable token;
    address payable public immutable treasury;
    uint256 public reservedRewards;

    struct Session { uint256 readyAt; uint256 reward; }
    mapping(address => Session) public sessions;
    mapping(address => uint256) public premiumUntil;

    error InvalidAddress();
    error SessionActive();
    error SessionNotReady();
    error InsufficientRewards();
    error IncorrectPayment();
    error PaymentFailed();

    event SessionStarted(address indexed account, uint256 readyAt, uint256 reward);
    event RewardClaimed(address indexed account, uint256 amount);
    event MembershipPurchased(address indexed account, uint256 expiresAt);

    constructor(IERC20 token_, address payable treasury_) {
        if (address(token_).code.length == 0 || treasury_ == address(0)) revert InvalidAddress();
        token = token_;
        treasury = treasury_;
    }

    function startSession() external nonReentrant {
        if (sessions[msg.sender].readyAt != 0) revert SessionActive();
        uint256 reward = premiumUntil[msg.sender] > block.timestamp ? ELITE_REWARD : BASE_REWARD;
        if (token.balanceOf(address(this)) < reservedRewards + reward) revert InsufficientRewards();
        uint256 readyAt = block.timestamp + SESSION_DURATION;
        sessions[msg.sender] = Session(readyAt, reward);
        reservedRewards += reward;
        emit SessionStarted(msg.sender, readyAt, reward);
    }

    function claim() external nonReentrant {
        Session memory session = sessions[msg.sender];
        if (session.readyAt == 0 || block.timestamp < session.readyAt) revert SessionNotReady();
        delete sessions[msg.sender];
        reservedRewards -= session.reward;
        token.safeTransfer(msg.sender, session.reward);
        emit RewardClaimed(msg.sender, session.reward);
    }

    function buyMembership() external payable nonReentrant {
        if (msg.value != MEMBERSHIP_PRICE) revert IncorrectPayment();
        uint256 start = premiumUntil[msg.sender] > block.timestamp ? premiumUntil[msg.sender] : block.timestamp;
        uint256 expiresAt = start + MEMBERSHIP_DURATION;
        premiumUntil[msg.sender] = expiresAt;
        (bool success,) = treasury.call{value: msg.value}("");
        if (!success) revert PaymentFailed();
        emit MembershipPurchased(msg.sender, expiresAt);
    }
}
