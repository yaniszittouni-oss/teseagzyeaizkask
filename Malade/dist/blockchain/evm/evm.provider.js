"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmProvider = void 0;
const viem_1 = require("viem");
const retry_1 = require("../../utils/retry");
/**
 * Couche commune aux 4 chaînes EVM (Ethereum, Base, BNB Chain, Arbitrum).
 *
 * Source de données : Etherscan API V2 (https://docs.etherscan.io/etherscan-v2)
 * qui expose Etherscan, BaseScan, BscScan et Arbiscan derrière un seul
 * endpoint, différencié par `chainid`, avec une clé unique. Les anciennes clés
 * par chaîne restent utilisables en surcharge (config.apiKey par provider).
 *
 * La couche fournit uniquement la RÉCUPÉRATION + NORMALISATION : aucun filtre
 * métier n'est appliqué ici — c'est le rôle exclusif du moteur de filtres.
 */
const ETHERSCAN_V2_BASE_URL = "https://api.etherscan.io/v2/api";
/** Intervalle minimal entre deux appels API, partagé entre TOUTES les chaînes
 *  EVM car elles consomment généralement la même clé (limite ~5 req/s). */
const MIN_API_INTERVAL_MS = 250;
class EvmProvider {
    config;
    /** File d'attente statique : throttle global toutes chaînes confondues. */
    static queue = Promise.resolve();
    static lastRequestAt = 0;
    chain;
    constructor(config) {
        this.config = config;
        this.chain = config.chain;
    }
    validateAddress(address) {
        return (0, viem_1.isAddress)(address, { strict: false });
    }
    getExplorerUrl(hash) {
        return `${this.config.explorerBaseUrl}/tx/${hash}`;
    }
    async getTransactions(address, options = {}) {
        const wallet = address.toLowerCase();
        const startBlock = options.startBlock ?? 0n;
        // Etherscan limite page × offset à 10 000 : on borne à une page.
        const limit = Math.min(options.limit ?? 500, 1000);
        const [nativeTxs, tokenTxs] = await Promise.all([
            this.fetchAccountList("txlist", wallet, startBlock, limit),
            this.fetchAccountList("tokentx", wallet, startBlock, limit),
        ]);
        const native = nativeTxs
            .filter((tx) => tx.isError !== "1")
            .map((tx) => this.normalizeNative(tx, wallet));
        const tokens = tokenTxs.map((tx) => this.normalizeToken(tx, wallet));
        return this.assignTransferIndexes([...native, ...tokens]);
    }
    /**
     * Récupération unitaire par hash via le module proxy (JSON-RPC relayé par
     * l'API). Renvoie une vue basique de la transaction native.
     */
    async getTransaction(hash) {
        const tx = await this.apiRequest({
            module: "proxy",
            action: "eth_getTransactionByHash",
            txhash: hash,
        });
        if (!tx || typeof tx === "string")
            return null;
        let timestamp = new Date(0);
        let blockNumber;
        if (tx.blockNumber) {
            blockNumber = Number(BigInt(tx.blockNumber));
            const block = await this.apiRequest({
                module: "proxy",
                action: "eth_getBlockByNumber",
                tag: tx.blockNumber,
                boolean: "false",
            });
            if (block && typeof block !== "string") {
                timestamp = new Date(Number(BigInt(block.timestamp)) * 1000);
            }
        }
        return {
            chain: this.chain,
            hash: tx.hash,
            timestamp,
            blockNumber,
            walletAddress: tx.from.toLowerCase(),
            from: tx.from.toLowerCase(),
            to: tx.to?.toLowerCase(),
            direction: "unknown",
            tokenSymbol: this.config.nativeSymbol,
            tokenDecimals: 18,
            amount: (0, viem_1.formatUnits)(BigInt(tx.value), 18),
            transactionType: "native_transfer",
            explorerUrl: this.getExplorerUrl(tx.hash),
            transferIndex: 0,
        };
    }
    // ── Récupération ────────────────────────────────────────────────────────────
    async fetchAccountList(action, address, startBlock, limit) {
        const result = await this.apiRequest({
            module: "account",
            action,
            address,
            startblock: startBlock.toString(),
            endblock: "999999999",
            page: "1",
            offset: String(limit),
            sort: "desc",
        });
        return Array.isArray(result) ? result : [];
    }
    async apiRequest(params) {
        const apiKey = this.config.apiKey;
        if (!apiKey) {
            throw new Error(`Aucune clé API configurée pour ${this.chain} : renseignez ETHERSCAN_API_KEY (clé V2 multi-chain) ou la clé héritée de la chaîne.`);
        }
        const url = new URL(ETHERSCAN_V2_BASE_URL);
        url.searchParams.set("chainid", String(this.config.chainId));
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        url.searchParams.set("apikey", apiKey);
        return (0, retry_1.withRetry)(async () => {
            await EvmProvider.throttle();
            const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
            if (!res.ok) {
                throw new Error(`${this.chain} explorer API : HTTP ${res.status}`);
            }
            const body = (await res.json());
            // "status 0 + No transactions found" est un résultat vide, pas une erreur.
            if (body.status === "0" && /no transactions found/i.test(body.message)) {
                return [];
            }
            // Rate limit / clé invalide / erreur API → message dans result.
            if (body.status === "0" && typeof body.result === "string") {
                throw new Error(`${this.chain} explorer API : ${body.result}`);
            }
            if (body.message === "NOTOK") {
                throw new Error(`${this.chain} explorer API : ${String(body.result)}`);
            }
            return body.result;
        }, { retries: 3, baseDelayMs: 600, timeoutMs: 20_000, label: `API ${this.chain}` });
    }
    /** Sérialise les appels et garantit un intervalle minimal entre requêtes. */
    static throttle() {
        const next = EvmProvider.queue.then(async () => {
            const wait = MIN_API_INTERVAL_MS - (Date.now() - EvmProvider.lastRequestAt);
            if (wait > 0)
                await (0, retry_1.sleep)(wait);
            EvmProvider.lastRequestAt = Date.now();
        });
        EvmProvider.queue = next.catch(() => undefined);
        return next;
    }
    // ── Normalisation ───────────────────────────────────────────────────────────
    direction(from, to, wallet) {
        const f = from.toLowerCase();
        const t = to.toLowerCase();
        if (f === wallet && t === wallet)
            return "self";
        if (f === wallet)
            return "outgoing";
        if (t === wallet)
            return "incoming";
        return "unknown";
    }
    normalizeNative(tx, wallet) {
        const value = BigInt(tx.value);
        const direction = this.direction(tx.from, tx.to, wallet);
        // Frais uniquement quand le wallet est l'émetteur (c'est lui qui paie).
        let fee;
        if (direction === "outgoing" || direction === "self") {
            const gasUsed = BigInt(tx.gasUsed || "0");
            const gasPrice = BigInt(tx.gasPrice || "0");
            fee = (0, viem_1.formatUnits)(gasUsed * gasPrice, 18);
        }
        return {
            chain: this.chain,
            hash: tx.hash,
            timestamp: new Date(Number(tx.timeStamp) * 1000),
            blockNumber: Number(tx.blockNumber),
            walletAddress: wallet,
            from: tx.from.toLowerCase(),
            to: tx.to ? tx.to.toLowerCase() : undefined,
            direction,
            tokenSymbol: this.config.nativeSymbol,
            tokenDecimals: 18,
            amount: (0, viem_1.formatUnits)(value, 18),
            fee,
            transactionType: value > 0n ? "native_transfer" : "contract_interaction",
            explorerUrl: this.getExplorerUrl(tx.hash),
        };
    }
    normalizeToken(tx, wallet) {
        // Ne jamais comparer les valeurs brutes : normalisation par 10^decimals
        // via BigInt (formatUnits), avant tout filtrage.
        const decimals = Number.parseInt(tx.tokenDecimal, 10) || 0;
        return {
            chain: this.chain,
            hash: tx.hash,
            timestamp: new Date(Number(tx.timeStamp) * 1000),
            blockNumber: Number(tx.blockNumber),
            walletAddress: wallet,
            from: tx.from.toLowerCase(),
            to: tx.to ? tx.to.toLowerCase() : undefined,
            direction: this.direction(tx.from, tx.to, wallet),
            tokenAddress: tx.contractAddress.toLowerCase(),
            tokenSymbol: tx.tokenSymbol || undefined,
            tokenDecimals: decimals,
            amount: (0, viem_1.formatUnits)(BigInt(tx.value), decimals),
            transactionType: "token_transfer",
            explorerUrl: this.getExplorerUrl(tx.hash),
        };
    }
    /**
     * Attribue un index déterministe à chaque transfert d'un même hash
     * (natif d'abord, puis tokens dans l'ordre de l'API). Cet index sert de
     * clé d'unicité au cache : un re-fetch produit les mêmes index.
     */
    assignTransferIndexes(transactions) {
        const counters = new Map();
        for (const tx of transactions) {
            const count = counters.get(tx.hash) ?? 0;
            tx.transferIndex = count;
            counters.set(tx.hash, count + 1);
        }
        return transactions;
    }
}
exports.EvmProvider = EvmProvider;
//# sourceMappingURL=evm.provider.js.map