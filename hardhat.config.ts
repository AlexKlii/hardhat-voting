import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage"

const config: HardhatUserConfig = {
  solidity: "0.8.13",
};

export default config;
