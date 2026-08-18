"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseProvider = void 0;
const env_1 = require("../../config/env");
const evm_provider_1 = require("../evm/evm.provider");
/**
 * Base — explorer : https://basescan.org/
 * Données via Etherscan API V2 (chainid 8453). La clé héritée BaseScan,
 * si renseignée, prime sur la clé V2 partagée.
 */
exports.baseProvider = new evm_provider_1.EvmProvider({
    chain: "base",
    chainId: 8453,
    explorerBaseUrl: "https://basescan.org",
    apiKey: env_1.env.BASESCAN_API_KEY ?? env_1.env.ETHERSCAN_API_KEY,
    nativeSymbol: "ETH",
});
//# sourceMappingURL=base.provider.js.map