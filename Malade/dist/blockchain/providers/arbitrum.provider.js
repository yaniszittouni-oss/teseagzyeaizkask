"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arbitrumProvider = void 0;
const env_1 = require("../../config/env");
const evm_provider_1 = require("../evm/evm.provider");
/**
 * Arbitrum One — explorer : https://arbiscan.io/
 * Données via Etherscan API V2 (chainid 42161). La clé héritée Arbiscan,
 * si renseignée, prime sur la clé V2 partagée.
 */
exports.arbitrumProvider = new evm_provider_1.EvmProvider({
    chain: "arbitrum",
    chainId: 42161,
    explorerBaseUrl: "https://arbiscan.io",
    apiKey: env_1.env.ARBISCAN_API_KEY ?? env_1.env.ETHERSCAN_API_KEY,
    nativeSymbol: "ETH",
});
//# sourceMappingURL=arbitrum.provider.js.map