"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSearchFilterOptions = addSearchFilterOptions;
exports.parseSearchFilters = parseSearchFilters;
exports.describeFilters = describeFilters;
const viem_1 = require("viem");
const supported_chain_1 = require("../../blockchain/types/supported-chain");
const date_1 = require("../../utils/date");
/**
 * Options de filtre partagées entre /search et /export.
 *
 * /export DOIT utiliser exactement le même moteur et les mêmes filtres que
 * /search : les définitions d'options et leur parsing vivent donc ici, en un
 * seul exemplaire.
 */
const CHAIN_CHOICES = [
    { name: "Toutes les blockchains", value: "all" },
    ...supported_chain_1.SUPPORTED_CHAINS.map((chain) => ({
        name: supported_chain_1.CHAIN_DISPLAY_NAMES[chain],
        value: chain,
    })),
];
function addSearchFilterOptions(builder) {
    return builder
        .addNumberOption((option) => option
        .setName("min_amount")
        .setDescription("Montant minimum, en unités du token (ex. 1000)")
        .setMinValue(0))
        .addNumberOption((option) => option
        .setName("max_amount")
        .setDescription("Montant maximum, en unités du token (ex. 10000)")
        .setMinValue(0))
        .addStringOption((option) => option
        .setName("from_date")
        .setDescription("Date minimum, format YYYY-MM-DD (ex. 2026-08-01)"))
        .addStringOption((option) => option
        .setName("to_date")
        .setDescription("Date maximum, format YYYY-MM-DD (ex. 2026-08-15)"))
        .addStringOption((option) => option
        .setName("from_time")
        .setDescription("Heure minimum UTC, format HH:mm (ex. 08:00)"))
        .addStringOption((option) => option
        .setName("to_time")
        .setDescription("Heure maximum UTC, format HH:mm (ex. 18:00)"))
        .addStringOption((option) => option
        .setName("chain")
        .setDescription("Blockchain ciblée (défaut : toutes)")
        .addChoices(...CHAIN_CHOICES))
        .addStringOption((option) => option
        .setName("token")
        .setDescription("Token : symbole (USDC, ETH...), contrat ERC-20 ou mint Solana"))
        .addNumberOption((option) => option
        .setName("min_usd")
        .setDescription("Contre-valeur USD minimum (approximative)")
        .setMinValue(0))
        .addNumberOption((option) => option
        .setName("max_usd")
        .setDescription("Contre-valeur USD maximum (approximative)")
        .setMinValue(0))
        .addStringOption((option) => option
        .setName("direction")
        .setDescription("Sens du transfert")
        .addChoices({ name: "Entrant (incoming)", value: "incoming" }, { name: "Sortant (outgoing)", value: "outgoing" }));
}
/** Un token saisi est-il une adresse (contrat EVM ou mint Solana) ? */
function classifyToken(input) {
    const trimmed = input.trim();
    if ((0, viem_1.isAddress)(trimmed, { strict: false }))
        return { tokenAddress: trimmed };
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed))
        return { tokenAddress: trimmed };
    return { tokenSymbol: trimmed };
}
function parseSearchFilters(interaction) {
    const filters = {};
    const chainOption = interaction.options.getString("chain");
    if (chainOption && chainOption !== "all") {
        if (!(0, supported_chain_1.isSupportedChain)(chainOption)) {
            return { ok: false, error: `Blockchain inconnue : \`${chainOption}\`` };
        }
        filters.chains = [chainOption];
    }
    const minAmount = interaction.options.getNumber("min_amount");
    const maxAmount = interaction.options.getNumber("max_amount");
    if (minAmount !== null)
        filters.minAmount = minAmount;
    if (maxAmount !== null)
        filters.maxAmount = maxAmount;
    if (filters.minAmount !== undefined &&
        filters.maxAmount !== undefined &&
        filters.minAmount > filters.maxAmount) {
        return { ok: false, error: "`min_amount` doit être inférieur ou égal à `max_amount`." };
    }
    const minUsd = interaction.options.getNumber("min_usd");
    const maxUsd = interaction.options.getNumber("max_usd");
    if (minUsd !== null)
        filters.minUsdAmount = minUsd;
    if (maxUsd !== null)
        filters.maxUsdAmount = maxUsd;
    if (filters.minUsdAmount !== undefined &&
        filters.maxUsdAmount !== undefined &&
        filters.minUsdAmount > filters.maxUsdAmount) {
        return { ok: false, error: "`min_usd` doit être inférieur ou égal à `max_usd`." };
    }
    const fromDateRaw = interaction.options.getString("from_date");
    if (fromDateRaw) {
        const parsed = (0, date_1.parseDateInput)(fromDateRaw);
        if (!parsed) {
            return { ok: false, error: `Date invalide : \`${fromDateRaw}\` (attendu : YYYY-MM-DD).` };
        }
        filters.fromDate = parsed;
    }
    const toDateRaw = interaction.options.getString("to_date");
    if (toDateRaw) {
        const parsed = (0, date_1.parseDateInput)(toDateRaw, true); // fin de journée incluse
        if (!parsed) {
            return { ok: false, error: `Date invalide : \`${toDateRaw}\` (attendu : YYYY-MM-DD).` };
        }
        filters.toDate = parsed;
    }
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
        return { ok: false, error: "`from_date` doit précéder `to_date`." };
    }
    const fromTimeRaw = interaction.options.getString("from_time");
    if (fromTimeRaw) {
        if ((0, date_1.parseTimeInput)(fromTimeRaw) === null) {
            return { ok: false, error: `Heure invalide : \`${fromTimeRaw}\` (attendu : HH:mm).` };
        }
        filters.fromTime = fromTimeRaw.trim();
    }
    const toTimeRaw = interaction.options.getString("to_time");
    if (toTimeRaw) {
        if ((0, date_1.parseTimeInput)(toTimeRaw) === null) {
            return { ok: false, error: `Heure invalide : \`${toTimeRaw}\` (attendu : HH:mm).` };
        }
        filters.toTime = toTimeRaw.trim();
    }
    const token = interaction.options.getString("token");
    if (token)
        Object.assign(filters, classifyToken(token));
    const direction = interaction.options.getString("direction");
    if (direction === "incoming" || direction === "outgoing") {
        filters.direction = direction;
    }
    return { ok: true, filters };
}
/** Résumé lisible des filtres actifs, pour l'en-tête des résultats. */
function describeFilters(filters) {
    const lines = [];
    if (filters.chains?.length) {
        lines.push(`Blockchain : ${filters.chains.map((c) => supported_chain_1.CHAIN_DISPLAY_NAMES[c]).join(", ")}`);
    }
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        const min = filters.minAmount !== undefined ? `≥ ${filters.minAmount}` : "";
        const max = filters.maxAmount !== undefined ? `≤ ${filters.maxAmount}` : "";
        lines.push(`Montant : ${[min, max].filter(Boolean).join(" et ")}`);
    }
    if (filters.minUsdAmount !== undefined || filters.maxUsdAmount !== undefined) {
        const min = filters.minUsdAmount !== undefined ? `≥ $${filters.minUsdAmount}` : "";
        const max = filters.maxUsdAmount !== undefined ? `≤ $${filters.maxUsdAmount}` : "";
        lines.push(`Contre-valeur USD : ${[min, max].filter(Boolean).join(" et ")}`);
    }
    if (filters.fromDate || filters.toDate) {
        const from = filters.fromDate ? filters.fromDate.toISOString().slice(0, 10) : "…";
        const to = filters.toDate ? filters.toDate.toISOString().slice(0, 10) : "…";
        lines.push(`Période : ${from} → ${to}`);
    }
    if (filters.fromTime || filters.toTime) {
        lines.push(`Heure (UTC) : ${filters.fromTime ?? "00:00"} → ${filters.toTime ?? "23:59"}`);
    }
    if (filters.tokenSymbol)
        lines.push(`Token : ${filters.tokenSymbol}`);
    if (filters.tokenAddress)
        lines.push(`Token (adresse) : \`${filters.tokenAddress}\``);
    if (filters.direction) {
        lines.push(`Direction : ${filters.direction === "incoming" ? "entrant" : "sortant"}`);
    }
    return lines;
}
//# sourceMappingURL=filter-options.js.map