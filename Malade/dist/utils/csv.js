"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionsToCsv = transactionsToCsv;
const date_1 = require("./date");
const HEADERS = [
    "chain",
    "wallet_label",
    "wallet_address",
    "transaction_hash",
    "timestamp_utc",
    "direction",
    "from",
    "to",
    "token_symbol",
    "token_address",
    "amount",
    "amount_usd",
    "fee_native",
    "transaction_type",
    "explorer_url",
];
function escapeCell(value) {
    if (value === undefined || value === null)
        return "";
    const str = String(value);
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
/**
 * Sérialise des transactions normalisées en CSV (RFC 4180).
 * Utilisé par /export et par le bouton "Export CSV" de la pagination :
 * les deux passent par le même moteur de recherche/filtrage en amont.
 */
function transactionsToCsv(transactions) {
    const rows = transactions.map((tx) => [
        tx.chain,
        tx.walletLabel,
        tx.walletAddress,
        tx.hash,
        (0, date_1.toIsoUtc)(tx.timestamp),
        tx.direction,
        tx.from,
        tx.to,
        tx.tokenSymbol,
        tx.tokenAddress,
        tx.amount,
        tx.amountUsd,
        tx.fee,
        tx.transactionType,
        tx.explorerUrl,
    ]
        .map(escapeCell)
        .join(","));
    return [HEADERS.join(","), ...rows].join("\r\n");
}
//# sourceMappingURL=csv.js.map