"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTransactions = searchTransactions;
const provider_registry_1 = require("../blockchain/provider-registry");
const env_1 = require("../config/env");
const prisma_1 = require("../database/prisma");
const cache_service_1 = require("../services/cache.service");
const concurrency_1 = require("../utils/concurrency");
const retry_1 = require("../utils/retry");
const transaction_filter_service_1 = require("./transaction-filter.service");
/**
 * Moteur de recherche multi-wallet / multi-chain.
 *
 * Pipeline (dans cet ordre, conformément au design) :
 *   récupération (cache + fetch incrémental) → normalisation → fusion des
 *   wallets → moteur de filtres interne → tri par timestamp décroissant.
 * La pagination et l'affichage sont gérés en aval par la couche Discord.
 *
 * Résilience : chaque wallet est interrogé avec une concurrence bornée,
 * un timeout global et un comportement "allSettled" — une API indisponible
 * dégrade la chaîne concernée mais ne fait jamais échouer la recherche.
 * Les données déjà en cache pour cette chaîne restent servies.
 */
const PER_WALLET_TIMEOUT_MS = 45_000;
async function searchTransactions(discordUserId, filters) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { discordId: discordUserId },
        include: {
            wallets: {
                where: filters.chains && filters.chains.length > 0
                    ? { chain: { in: filters.chains } }
                    : undefined,
                orderBy: { createdAt: "asc" },
            },
        },
    });
    const wallets = user?.wallets ?? [];
    if (wallets.length === 0) {
        return { transactions: [], statuses: [], totalWallets: 0 };
    }
    const results = await (0, concurrency_1.mapWithConcurrency)(wallets, env_1.env.SEARCH_CONCURRENCY, (wallet) => loadWallet(wallet, filters));
    const loaded = [];
    for (const [index, result] of results.entries()) {
        if (result.status === "fulfilled") {
            loaded.push(result.value);
        }
        else {
            // loadWallet capture déjà ses erreurs ; ceci est une ceinture de sécurité.
            const wallet = wallets[index];
            if (wallet) {
                loaded.push({
                    wallet,
                    transactions: [],
                    syncError: errorMessage(result.reason),
                });
            }
        }
    }
    // Fusion des wallets → filtres internes → tri du plus récent au plus ancien.
    const merged = loaded.flatMap((entry) => entry.transactions);
    const filtered = (0, transaction_filter_service_1.filterTransactions)(merged, filters);
    const sorted = (0, transaction_filter_service_1.sortByTimestampDesc)(filtered);
    return {
        transactions: sorted,
        statuses: buildStatuses(loaded),
        totalWallets: wallets.length,
    };
}
/**
 * Synchronise puis lit le cache d'un wallet. Un échec de synchronisation
 * n'est pas fatal : on sert le cache existant et on remonte l'erreur pour
 * l'affichage "⚠️ chaîne temporairement indisponible".
 */
async function loadWallet(wallet, filters) {
    const provider = (0, provider_registry_1.getProvider)(wallet.chain);
    let syncError;
    try {
        await (0, retry_1.withTimeout)(cache_service_1.cacheService.syncWallet(wallet, provider), PER_WALLET_TIMEOUT_MS, `sync ${wallet.chain}:${wallet.address}`);
    }
    catch (error) {
        syncError = errorMessage(error);
    }
    const transactions = await cache_service_1.cacheService.getCachedTransactions(wallet, {
        fromDate: filters.fromDate,
        toDate: filters.toDate,
    });
    return { wallet, transactions, syncError };
}
function buildStatuses(loaded) {
    const byChain = new Map();
    for (const entry of loaded) {
        const chain = entry.wallet.chain;
        const status = byChain.get(chain) ?? { chain, ok: true, walletCount: 0 };
        status.walletCount += 1;
        if (entry.syncError && status.ok) {
            status.ok = false;
            status.error = entry.syncError;
        }
        byChain.set(chain, status);
    }
    return [...byChain.values()];
}
function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
//# sourceMappingURL=transaction-search.service.js.map