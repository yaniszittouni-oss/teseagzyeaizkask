"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ethereumProvider = void 0;
const env_1 = require("../../config/env");
const evm_provider_1 = require("../evm/evm.provider");
/**
 * Ethereum — explorer : https://etherscan.io/
 * Données via Etherscan API V2 (chainid 1).
 */
exports.ethereumProvider = new evm_provider_1.EvmProvider({
    chain: "ethereum",
    chainId: 1,
    explorerBaseUrl: "https://etherscan.io",
    apiKey: env_1.env.ETHERSCAN_API_KEY,
    nativeSymbol: "ETH",
});
//# sourceMappingURL=ethereum.provider.js.map