"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterTransactions = filterTransactions;
exports.sortByTimestampDesc = sortByTimestampDesc;
const date_1 = require("../utils/date");
const decimal_1 = require("../utils/decimal");
/**
 * Moteur de filtres interne.
 *
 * Fonction PURE : elle ne travaille que sur des `NormalizedTransaction` et ne
 * contient aucune logique propre à Etherscan, Solscan ou tout autre explorer.
 * C'est elle — et elle seule — qui décide de ce qui matche, ce qui rend les
 * capacités de filtrage du bot indépendantes de celles des explorers.
 */
function filterTransactions(transactions, filters) {
    return transactions.filter((tx) => matchesFilters(tx, filters));
}
function matchesFilters(tx, filters) {
    // ── Chaîne ──────────────────────────────────────────────────────────────
    if (filters.chains && filters.chains.length > 0 && !filters.chains.includes(tx.chain)) {
        return false;
    }
    // ── Montant (unités token, comparaison décimale exacte via BigInt) ──────
    if (filters.minAmount !== undefined) {
        const cmp = (0, decimal_1.compareDecimal)(tx.amount, filters.minAmount);
        if (cmp === null || cmp < 0)
            return false;
    }
    if (filters.maxAmount !== undefined) {
        const cmp = (0, decimal_1.compareDecimal)(tx.amount, filters.maxAmount);
        if (cmp === null || cmp > 0)
            return false;
    }
    // ── Contre-valeur USD (exclut les tx sans estimation USD, choix assumé) ─
    if (filters.minUsdAmount !== undefined) {
        if (tx.amountUsd === undefined || tx.amountUsd < filters.minUsdAmount)
            return false;
    }
    if (filters.maxUsdAmount !== undefined) {
        if (tx.amountUsd === undefined || tx.amountUsd > filters.maxUsdAmount)
            return false;
    }
    // ── Dates (bornes UTC inclusives) ───────────────────────────────────────
    const time = tx.timestamp.getTime();
    if (filters.fromDate && time < filters.fromDate.getTime())
        return false;
    if (filters.toDate && time > filters.toDate.getTime())
        return false;
    // ── Heure de la journée (UTC) — indisponible sur les explorers, appliqué
    //    ici après normalisation des timestamps ────────────────────────────
    if (filters.fromTime !== undefined || filters.toTime !== undefined) {
        const minutes = (0, date_1.minutesOfDayUtc)(tx.timestamp);
        const from = filters.fromTime !== undefined ? (0, date_1.parseTimeInput)(filters.fromTime) : 0;
        const to = filters.toTime !== undefined ? (0, date_1.parseTimeInput)(filters.toTime) : 23 * 60 + 59;
        if (from === null || to === null)
            return false;
        if (from <= to) {
            if (minutes < from || minutes > to)
                return false;
        }
        else {
            // Fenêtre à cheval sur minuit, ex. 22:00 → 06:00.
            if (minutes < from && minutes > to)
                return false;
        }
    }
    // ── Token : symbole (insensible à la casse) et/ou adresse de contrat ────
    if (filters.tokenSymbol !== undefined) {
        if (!tx.tokenSymbol)
            return false;
        if (tx.tokenSymbol.toUpperCase() !== filters.tokenSymbol.toUpperCase())
            return false;
    }
    if (filters.tokenAddress !== undefined) {
        if (!tx.tokenAddress)
            return false;
        if (tx.tokenAddress.toLowerCase() !== filters.tokenAddress.toLowerCase())
            return false;
    }
    // ── Direction / type ────────────────────────────────────────────────────
    if (filters.direction !== undefined && tx.direction !== filters.direction) {
        return false;
    }
    if (filters.transactionType !== undefined &&
        tx.transactionType !== filters.transactionType) {
        return false;
    }
    return true;
}
/** Tri du plus récent au plus ancien (ordre d'affichage des résultats). */
function sortByTimestampDesc(transactions) {
    return [...transactions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
//# sourceMappingURL=transaction-filter.service.js.map