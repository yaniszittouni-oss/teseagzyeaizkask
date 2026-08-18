"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NATIVE_SYMBOLS = exports.CHAIN_DISPLAY_NAMES = exports.EVM_CHAINS = exports.SUPPORTED_CHAINS = void 0;
exports.isSupportedChain = isSupportedChain;
exports.isEvmChain = isEvmChain;
/**
 * Les 5 seules blockchains supportées par le bot.
 * Aucune autre chaîne ne doit être ajoutée ici sans décision explicite.
 */
exports.SUPPORTED_CHAINS = [
    "ethereum",
    "base",
    "solana",
    "bnb",
    "arbitrum",
];
/** Chaînes compatibles EVM (adresses 0x..., APIs de type Etherscan). */
exports.EVM_CHAINS = ["ethereum", "base", "bnb", "arbitrum"];
function isSupportedChain(value) {
    return exports.SUPPORTED_CHAINS.includes(value);
}
function isEvmChain(chain) {
    return exports.EVM_CHAINS.includes(chain);
}
/** Noms affichés dans Discord. */
exports.CHAIN_DISPLAY_NAMES = {
    ethereum: "Ethereum",
    base: "Base",
    solana: "Solana",
    bnb: "BNB Smart Chain",
    arbitrum: "Arbitrum",
};
/** Symbole du token natif de chaque chaîne. */
exports.NATIVE_SYMBOLS = {
    ethereum: "ETH",
    base: "ETH",
    solana: "SOL",
    bnb: "BNB",
    arbitrum: "ETH",
};
//# sourceMappingURL=supported-chain.js.map