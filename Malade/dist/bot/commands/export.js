"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportCommand = void 0;
const discord_js_1 = require("discord.js");
const transaction_search_service_1 = require("../../search/transaction-search.service");
const csv_1 = require("../../utils/csv");
const date_1 = require("../../utils/date");
const filter_options_1 = require("./filter-options");
/**
 * /export format:<csv|json> [mêmes filtres que /search]
 *
 * Réutilise EXACTEMENT le même moteur de recherche et de filtrage que
 * /search (searchTransactions + parseSearchFilters) : aucune seconde logique
 * de filtrage n'existe. Seule la sérialisation diffère.
 */
const data = (0, filter_options_1.addSearchFilterOptions)(new discord_js_1.SlashCommandBuilder()
    .setName("export")
    .setDescription("Exporter les transactions filtrées en CSV ou JSON")
    .addStringOption((option) => option
    .setName("format")
    .setDescription("Format d'export")
    .setRequired(true)
    .addChoices({ name: "CSV", value: "csv" }, { name: "JSON", value: "json" })));
function toJsonExport(transactions) {
    return JSON.stringify(transactions.map((tx) => ({
        chain: tx.chain,
        wallet_label: tx.walletLabel ?? null,
        wallet_address: tx.walletAddress,
        transaction_hash: tx.hash,
        timestamp_utc: (0, date_1.toIsoUtc)(tx.timestamp),
        block_number: tx.blockNumber ?? null,
        direction: tx.direction,
        from: tx.from,
        to: tx.to ?? null,
        token_symbol: tx.tokenSymbol ?? null,
        token_address: tx.tokenAddress ?? null,
        token_decimals: tx.tokenDecimals ?? null,
        amount: tx.amount,
        amount_usd: tx.amountUsd ?? null,
        fee_native: tx.fee ?? null,
        transaction_type: tx.transactionType ?? null,
        explorer_url: tx.explorerUrl,
    })), null, 2);
}
async function execute(interaction) {
    const format = interaction.options.getString("format", true);
    const parsed = (0, filter_options_1.parseSearchFilters)(interaction);
    if (!parsed.ok) {
        await interaction.reply({
            content: `❌ ${parsed.error}`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const outcome = await (0, transaction_search_service_1.searchTransactions)(interaction.user.id, parsed.filters);
    if (outcome.totalWallets === 0) {
        await interaction.editReply({
            content: "Tu n'as aucun wallet enregistré. Ajoute-en un avec `/wallet add`.",
        });
        return;
    }
    if (outcome.transactions.length === 0) {
        await interaction.editReply({
            content: "🔎 Aucune transaction ne correspond aux filtres : rien à exporter.",
        });
        return;
    }
    const content = format === "csv"
        ? (0, csv_1.transactionsToCsv)(outcome.transactions)
        : toJsonExport(outcome.transactions);
    const file = new discord_js_1.AttachmentBuilder(Buffer.from(content, "utf8"), {
        name: `transactions-${new Date().toISOString().slice(0, 10)}.${format}`,
    });
    const degraded = outcome.statuses.filter((status) => !status.ok);
    const warning = degraded.length > 0
        ? `\n⚠️ Chaîne(s) temporairement indisponible(s) : ${degraded
            .map((status) => status.chain)
            .join(", ")} — export basé sur le cache.`
        : "";
    await interaction.editReply({
        content: `📄 Export ${format.toUpperCase()} — ${outcome.transactions.length} transaction(s).${warning}`,
        files: [file],
    });
}
exports.exportCommand = { data, execute };
//# sourceMappingURL=export.js.map