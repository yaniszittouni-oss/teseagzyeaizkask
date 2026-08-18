"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceService = void 0;
const supported_chain_1 = require("../blockchain/types/supported-chain");
const retry_1 = require("../utils/retry");
/**
 * Service de prix USD — volontairement simple et remplaçable.
 *
 * Limites assumées (documentées) :
 *  - les stablecoins connus sont valorisés à 1 $ ;
 *  - les tokens natifs (ETH/BNB/SOL) utilisent le prix SPOT CoinGecko au
 *    moment de l'indexation, pas le prix historique à la date de la
 *    transaction. `amountUsd` est donc une approximation : les filtres
 *    min_usd/max_usd doivent être compris comme approximatifs.
 * Une implémentation de production brancherait ici une API de prix
 * historiques sans toucher au reste de l'architecture.
 */
const COINGECKO_IDS = {
    ethereum: "ethereum",
    base: "ethereum", // le natif de Base est l'ETH
    arbitrum: "ethereum", // idem pour Arbitrum
    bnb: "binancecoin",
    solana: "solana",
};
const STABLECOIN_SYMBOLS = new Set([
    "USDC",
    "USDT",
    "DAI",
    "BUSD",
    "TUSD",
    "FDUSD",
    "USDS",
    "USDC.E",
]);
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;
class PriceService {
    cache = new Map();
    /** Prix USD du token natif d'une chaîne, ou undefined si indisponible. */
    async getNativeUsdPrice(chain) {
        const id = COINGECKO_IDS[chain];
        const cached = this.cache.get(id);
        if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
            return cached.price;
        }
        try {
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
            const data = await (0, retry_1.withRetry)(async () => {
                const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
                if (!res.ok)
                    throw new Error(`CoinGecko HTTP ${res.status}`);
                return (await res.json());
            }, { retries: 1, baseDelayMs: 1_000, label: "CoinGecko" });
            const price = data[id]?.usd;
            if (typeof price !== "number")
                return undefined;
            this.cache.set(id, { price, fetchedAt: Date.now() });
            return price;
        }
        catch {
            // Le prix est un enrichissement optionnel : jamais bloquant.
            return cached?.price;
        }
    }
    /**
     * Enrichit `amountUsd` quand c'est possible (stablecoins, tokens natifs).
     * Ne lève jamais : une API de prix en panne ne casse pas la recherche.
     */
    async enrichUsd(transactions) {
        const nativePrices = new Map();
        for (const tx of transactions) {
            if (tx.amountUsd !== undefined)
                continue;
            const amount = Number(tx.amount);
            if (!Number.isFinite(amount))
                continue;
            const symbol = tx.tokenSymbol?.toUpperCase();
            if (symbol && STABLECOIN_SYMBOLS.has(symbol)) {
                tx.amountUsd = amount;
                continue;
            }
            const isNative = tx.tokenAddress === undefined && symbol === supported_chain_1.NATIVE_SYMBOLS[tx.chain];
            if (!isNative)
                continue;
            if (!nativePrices.has(tx.chain)) {
                nativePrices.set(tx.chain, await this.getNativeUsdPrice(tx.chain));
            }
            const price = nativePrices.get(tx.chain);
            if (price !== undefined) {
                tx.amountUsd = amount * price;
            }
        }
    }
}
exports.priceService = new PriceService();
//# sourceMappingURL=price.service.js.map