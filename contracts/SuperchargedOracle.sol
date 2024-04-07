// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

contract SuperchargedOracle {
    uint256 public counter;
    uint256 public price;

    event IncrementCounter(address msgSender, uint256 newCounterValue);

    event PriceUpdated(
        uint256 indexed timeStamp,
        uint256 price,
        address msgSender
    );

    error CustomError(uint256 price);

    function increment() external {
        counter++;
        emit IncrementCounter(msg.sender, counter);
    }

    function updatePrice(uint256 _price) external {
        price = _price;

        emit PriceUpdated(block.timestamp, _price, msg.sender);
    }

    function updatePriceRevert(uint256 _price) external {
        price = _price;

        revert("Error Revert Price");
    }
}
