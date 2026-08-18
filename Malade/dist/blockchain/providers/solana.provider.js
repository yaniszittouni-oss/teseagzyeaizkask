"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solanaProvider = exports.SolanaProvider = void 0;
const web3_js_1 = require("@solana/web3.js");
const viem_1 = require("viem");
const env_1 = require("../../config/env");
const concurrency_1 = require("../../utils/concurrency");
const retry_1 = require("../../utils/retry");
/**
 * Solana — explorer : https://solscan.io/
 *
 * Données via RPC JSON (getSignaturesForAddress + getParsedTransactions),
 * indépendant des capacités de recherche de Solscan : la récupération est
 * brute, la normalisation est locale, et TOUT le filtrage (montant, dates,
 * heures, token...) est appliqué ensuite par le moteur de filtres interne.
 *
 * Extraction des transferts :
 *  - SOL natif  : instructions `system::transfer` parsées (top-level + inner) ;
 *  - tokens SPL : deltas de balances (pre/postTokenBalances) agrégés par
 *    (owner, mint) — robuste face à transfer/transferChecked/multi-comptes.
 */
const LAMPORTS_DECIMALS = 9;
const PARSED_TX_BATCH_SIZE = 20;
/** Symboles des mints SPL les plus courants (extensible / remplaçable par
 *  une token-list complète sans impact sur le reste de l'architecture). */
const KNOWN_SPL_TOKENS = {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
    So11111111111111111111111111111111111111112: "WSOL",
    JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: "JUP",
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
};
class SolanaProvider {
    chain = "solana";
    connection;
    constructor(rpcUrl = env_1.env.SOLANA_RPC_URL) {
        this.connection = new web3_js_1.Connection(rpcUrl, { commitment: "confirmed" });
    }
    validateAddress(address) {
        // Une adresse Solana est une clé publique ed25519 encodée en base58.
        try {
            new web3_js_1.PublicKey(address);
            return true;
        }
        catch {
            return false;
        }
    }
    getExplorerUrl(signature) {
        return `https://solscan.io/tx/${signature}`;
    }
    async getTransactions(address, options = {}) {
        const pubkey = new web3_js_1.PublicKey(address);
        const limit = Math.min(options.limit ?? 200, 1000);
        const signatureInfos = await (0, retry_1.withRetry)(() => this.connection.getSignaturesForAddress(pubkey, {
            limit,
            until: options.untilSignature,
        }), { retries: 3, baseDelayMs: 800, timeoutMs: 20_000, label: "RPC Solana (signatures)" });
        const signatures = signatureInfos
            .filter((info) => !info.err)
            .map((info) => info.signature);
        if (signatures.length === 0)
            return [];
        const transactions = [];
        // Le RPC public limite la taille des batchs : on découpe.
        for (const batch of (0, concurrency_1.chunk)(signatures, PARSED_TX_BATCH_SIZE)) {
            const parsed = await (0, retry_1.withRetry)(() => this.connection.getParsedTransactions(batch, {
                maxSupportedTransactionVersion: 0,
            }), { retries: 3, baseDelayMs: 800, timeoutMs: 30_000, label: "RPC Solana (transactions)" });
            for (const tx of parsed) {
                if (tx)
                    transactions.push(...this.extractTransfers(tx, address));
            }
        }
        return transactions;
    }
    async getTransaction(signature) {
        const tx = await (0, retry_1.withRetry)(() => this.connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        }), { retries: 2, baseDelayMs: 800, timeoutMs: 20_000, label: "RPC Solana (transaction)" });
        if (!tx)
            return null;
        const feePayer = tx.transaction.message.accountKeys[0]?.pubkey.toBase58() ?? "unknown";
        const transfers = this.extractTransfers(tx, feePayer);
        if (transfers.length > 0)
            return transfers[0] ?? null;
        // Transaction sans transfert détecté : vue minimale.
        return {
            chain: this.chain,
            hash: signature,
            timestamp: new Date((tx.blockTime ?? 0) * 1000),
            blockNumber: tx.slot,
            walletAddress: feePayer,
            from: feePayer,
            direction: "unknown",
            tokenSymbol: "SOL",
            tokenDecimals: LAMPORTS_DECIMALS,
            amount: "0",
            fee: tx.meta ? (0, viem_1.formatUnits)(BigInt(tx.meta.fee), LAMPORTS_DECIMALS) : undefined,
            transactionType: "program_interaction",
            explorerUrl: this.getExplorerUrl(signature),
            transferIndex: 0,
        };
    }
    // ── Normalisation ───────────────────────────────────────────────────────────
    extractTransfers(tx, walletAddress) {
        const meta = tx.meta;
        const signature = tx.transaction.signatures[0];
        if (!meta || meta.err || !tx.blockTime || !signature)
            return [];
        const timestamp = new Date(tx.blockTime * 1000);
        const feePayer = tx.transaction.message.accountKeys[0]?.pubkey.toBase58();
        const fee = feePayer === walletAddress
            ? (0, viem_1.formatUnits)(BigInt(meta.fee), LAMPORTS_DECIMALS)
            : undefined;
        const results = [];
        let transferIndex = 0;
        const push = (partial) => {
            results.push({
                chain: this.chain,
                hash: signature,
                timestamp,
                blockNumber: tx.slot,
                walletAddress,
                explorerUrl: this.getExplorerUrl(signature),
                fee,
                transferIndex: transferIndex++,
                ...partial,
            });
        };
        // 1) SOL natif — instructions system::transfer, top-level puis inner
        //    (l'ordre est stable, donc transferIndex est déterministe).
        const allInstructions = [
            ...tx.transaction.message.instructions,
            ...(meta.innerInstructions ?? []).flatMap((inner) => inner.instructions),
        ];
        for (const instruction of allInstructions) {
            if (!("parsed" in instruction) || instruction.program !== "system")
                continue;
            const parsed = instruction.parsed;
            if (parsed.type !== "transfer" || !parsed.info)
                continue;
            const { source, destination, lamports } = parsed.info;
            if (lamports === undefined)
                continue;
            if (source !== walletAddress && destination !== walletAddress)
                continue;
            push({
                from: source ?? "unknown",
                to: destination,
                direction: source === walletAddress && destination === walletAddress
                    ? "self"
                    : source === walletAddress
                        ? "outgoing"
                        : "incoming",
                tokenSymbol: "SOL",
                tokenDecimals: LAMPORTS_DECIMALS,
                amount: (0, viem_1.formatUnits)(BigInt(lamports), LAMPORTS_DECIMALS),
                transactionType: "native_transfer",
            });
        }
        // 2) Tokens SPL — deltas de balances agrégés par (owner, mint).
        const deltas = new Map();
        const applyBalances = (balances, sign) => {
            for (const balance of balances ?? []) {
                if (!balance.owner)
                    continue;
                const key = `${balance.owner}:${balance.mint}`;
                const entry = deltas.get(key) ??
                    {
                        mint: balance.mint,
                        owner: balance.owner,
                        decimals: balance.uiTokenAmount.decimals,
                        delta: 0n,
                    };
                entry.delta += sign * BigInt(balance.uiTokenAmount.amount);
                deltas.set(key, entry);
            }
        };
        applyBalances(meta.preTokenBalances, -1n);
        applyBalances(meta.postTokenBalances, 1n);
        // Tri par mint pour un ordre (et donc un transferIndex) déterministe.
        const walletDeltas = [...deltas.values()]
            .filter((entry) => entry.owner === walletAddress && entry.delta !== 0n)
            .sort((a, b) => a.mint.localeCompare(b.mint));
        for (const entry of walletDeltas) {
            const incoming = entry.delta > 0n;
            const absolute = incoming ? entry.delta : -entry.delta;
            // Contrepartie probable : un autre owner dont le delta du même mint
            // est de signe opposé.
            const counterparty = [...deltas.values()].find((other) => other.mint === entry.mint &&
                other.owner !== walletAddress &&
                other.delta !== 0n &&
                other.delta > 0n !== incoming);
            push({
                from: incoming ? (counterparty?.owner ?? "unknown") : walletAddress,
                to: incoming ? walletAddress : counterparty?.owner,
                direction: incoming ? "incoming" : "outgoing",
                tokenAddress: entry.mint,
                tokenSymbol: KNOWN_SPL_TOKENS[entry.mint],
                tokenDecimals: entry.decimals,
                amount: (0, viem_1.formatUnits)(absolute, entry.decimals),
                transactionType: "token_transfer",
            });
        }
        return results;
    }
}
exports.SolanaProvider = SolanaProvider;
exports.solanaProvider = new SolanaProvider();
//# sourceMappingURL=solana.provider.js.map