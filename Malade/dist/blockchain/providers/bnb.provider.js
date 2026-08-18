"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bnbProvider = void 0;
const env_1 = require("../../config/env");
const evm_provider_1 = require("../evm/evm.provider");
/**
 * BNB Smart Chain — explorer : https://bscscan.com/
 * Données via Etherscan API V2 (chainid 56). La clé héritée BscScan,
 * si renseignée, prime sur la clé V2 partagée.
 */
exports.bnbProvider = new evm_provider_1.EvmProvider({
    chain: "bnb",
    chainId: 56,
    explorerBaseUrl: "https://bscscan.com",
    apiKey: env_1.env.BSCSCAN_API_KEY ?? env_1.env.ETHERSCAN_API_KEY,
    nativeSymbol: "BNB",
});
//# sourceMappingURL=bnb.provider.js.map