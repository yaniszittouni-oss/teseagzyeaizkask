"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = getProvider;
const ethereum_provider_1 = require("./providers/ethereum.provider");
const base_provider_1 = require("./providers/base.provider");
const solana_provider_1 = require("./providers/solana.provider");
const bnb_provider_1 = require("./providers/bnb.provider");
const arbitrum_provider_1 = require("./providers/arbitrum.provider");
/**
 * Registre central des providers — un par blockchain supportée, pas un de plus.
 * Pour remplacer une source de données (ex. passer Solana sur l'API Solscan
 * Pro), il suffit de substituer l'implémentation ici.
 */
const PROVIDERS = {
    ethereum: ethereum_provider_1.ethereumProvider,
    base: base_provider_1.baseProvider,
    solana: solana_provider_1.solanaProvider,
    bnb: bnb_provider_1.bnbProvider,
    arbitrum: arbitrum_provider_1.arbitrumProvider,
};
function getProvider(chain) {
    return PROVIDERS[chain];
}
//# sourceMappingURL=provider-registry.js.map