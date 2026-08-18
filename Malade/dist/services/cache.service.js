"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const supported_chain_1 = require("../blockchain/types/supported-chain");
const env_1 = require("../config/env");
const prisma_1 = require("../database/prisma");
const price_service_1 = require("./price.service");
/**
 * Cache d'indexation des transactions (table TransactionCache).
 *
 * Objectif : ne pas re-télécharger tout l'historique à chaque /search.
 *  - un watermark par wallet (lastSyncedBlock pour l'EVM, lastSignature pour
 *    Solana) permet des fetchs incrémentaux ;
 *  - `lastSyncedAt` + CACHE_TTL_SECONDS évitent de re-fetcher un wallet
 *    interrogé il y a quelques secondes ;
 *  - l'unicité (chain, walletAddress, transactionHash, transferIndex) +
 *    `skipDuplicates` rendent les chevauchements de fetch inoffensifs.
 */
const MAX_CACHED_ROWS_PER_QUERY = 5_000;
class CacheService {
    /**
     * Synchronise le cache d'un wallet : récupère les transactions plus
     * récentes que le watermark, les enrichit (USD) puis les insère.
     * Lève en cas d'échec du provider — l'appelant décide quoi en faire
     * (le cache existant reste servable).
     */
    async syncWallet(wallet, provider) {
        if (wallet.lastSyncedAt &&
            Date.now() - wallet.lastSyncedAt.getTime() < env_1.env.CACHE_TTL_SECONDS * 1000) {
            return; // Cache encore frais.
        }
        const chain = wallet.chain;
        const options = (0, supported_chain_1.isEvmChain)(chain)
            ? {
                startBlock: wallet.lastSyncedBlock !== null ? wallet.lastSyncedBlock + 1n : undefined,
                limit: env_1.env.MAX_TX_PER_FETCH,
            }
            : {
                untilSignature: wallet.lastSignature ?? undefined,
                limit: env_1.env.MAX_TX_PER_FETCH,
            };
        const transactions = await provider.getTransactions(wallet.address, options);
        if (transactions.length > 0) {
            await price_service_1.priceService.enrichUsd(transactions);
            await prisma_1.prisma.transactionCache.createMany({
                data: transactions.map((tx) => ({
                    chain: wallet.chain,
                    walletAddress: wallet.address,
                    transactionHash: tx.hash,
                    transferIndex: tx.transferIndex ?? 0,
                    timestamp: tx.timestamp,
                    blockNumber: tx.blockNumber !== undefined ? BigInt(tx.blockNumber) : null,
                    fromAddress: tx.from,
                    toAddress: tx.to ?? null,
                    direction: tx.direction,
                    tokenAddress: tx.tokenAddress ?? null,
                    tokenSymbol: tx.tokenSymbol ?? null,
                    tokenDecimals: tx.tokenDecimals ?? null,
                    amount: tx.amount,
                    amountUsd: tx.amountUsd ?? null,
                    fee: tx.fee ?? null,
                    transactionType: tx.transactionType ?? null,
                    explorerUrl: tx.explorerUrl,
                })),
                skipDuplicates: true,
            });
        }
        await prisma_1.prisma.wallet.update({
            where: { id: wallet.id },
            data: {
                lastSyncedAt: new Date(),
                ...this.computeWatermarks(chain, transactions),
            },
        });
    }
    /**
     * Lit les transactions en cache d'un wallet, converties au format commun.
     * Les bornes de dates sont poussées en SQL par pure efficacité : le
     * filtrage métier complet reste du ressort du moteur de filtres.
     */
    async getCachedTransactions(wallet, bounds = {}) {
        const rows = await prisma_1.prisma.transactionCache.findMany({
            where: {
                chain: wallet.chain,
                walletAddress: wallet.address,
                ...(bounds.fromDate || bounds.toDate
                    ? {
                        timestamp: {
                            ...(bounds.fromDate ? { gte: bounds.fromDate } : {}),
                            ...(bounds.toDate ? { lte: bounds.toDate } : {}),
                        },
                    }
                    : {}),
            },
            orderBy: { timestamp: "desc" },
            take: MAX_CACHED_ROWS_PER_QUERY,
        });
        return rows.map((row) => this.rowToNormalized(row, wallet.label));
    }
    /** Nombre de transactions en cache pour un wallet (pour /wallet info). */
    async countCachedTransactions(wallet) {
        return prisma_1.prisma.transactionCache.count({
            where: { chain: wallet.chain, walletAddress: wallet.address },
        });
    }
    // ── Interne ────────────────────────────────────────────────────────────────
    computeWatermarks(chain, transactions) {
        if (transactions.length === 0)
            return {};
        if ((0, supported_chain_1.isEvmChain)(chain)) {
            let maxBlock;
            for (const tx of transactions) {
                if (tx.blockNumber === undefined)
                    continue;
                const block = BigInt(tx.blockNumber);
                if (maxBlock === undefined || block > maxBlock)
                    maxBlock = block;
            }
            return maxBlock !== undefined ? { lastSyncedBlock: maxBlock } : {};
        }
        // Solana : signature de la transaction la plus récente.
        const newest = transactions.reduce((a, b) => a.timestamp.getTime() >= b.timestamp.getTime() ? a : b);
        return { lastSignature: newest.hash };
    }
    rowToNormalized(row, walletLabel) {
        return {
            chain: row.chain,
            hash: row.transactionHash,
            timestamp: row.timestamp,
            blockNumber: row.blockNumber !== null ? Number(row.blockNumber) : undefined,
            walletAddress: row.walletAddress,
            from: row.fromAddress,
            to: row.toAddress ?? undefined,
            direction: row.direction,
            tokenAddress: row.tokenAddress ?? undefined,
            tokenSymbol: row.tokenSymbol ?? undefined,
            tokenDecimals: row.tokenDecimals ?? undefined,
            amount: row.amount,
            amountUsd: row.amountUsd ?? undefined,
            fee: row.fee ?? undefined,
            transactionType: row.transactionType ?? undefined,
            explorerUrl: row.explorerUrl,
            transferIndex: row.transferIndex,
            walletLabel,
        };
    }
}
exports.cacheService = new CacheService();
//# sourceMappingURL=cache.service.js.map