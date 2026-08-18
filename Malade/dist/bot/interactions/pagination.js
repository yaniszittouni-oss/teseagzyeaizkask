"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGE_SIZE = void 0;
exports.createSearchSession = createSearchSession;
exports.buildSearchView = buildSearchView;
exports.isSearchButton = isSearchButton;
exports.handleSearchButton = handleSearchButton;
const node_crypto_1 = require("node:crypto");
const discord_js_1 = require("discord.js");
const supported_chain_1 = require("../../blockchain/types/supported-chain");
const csv_1 = require("../../utils/csv");
const date_1 = require("../../utils/date");
const format_1 = require("../../utils/format");
/**
 * Pagination des résultats de recherche.
 *
 * Discord limite la taille des messages : les résultats sont découpés en
 * pages de 10 transactions, naviguées via les boutons ⬅️/➡️, avec un bouton
 * 📄 Export CSV qui sérialise l'ensemble filtré courant (même moteur que
 * /export). Les sessions vivent en mémoire avec un TTL.
 */
exports.PAGE_SIZE = 10;
const SESSION_TTL_MS = 15 * 60 * 1000;
const sessions = new Map();
// Purge périodique des sessions expirées (unref : n'empêche pas l'arrêt).
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
        if (now - session.createdAt > SESSION_TTL_MS)
            sessions.delete(id);
    }
}, 60_000).unref();
function createSearchSession(discordUserId, outcome, filterSummary) {
    const session = {
        id: (0, node_crypto_1.randomUUID)(),
        discordUserId,
        outcome,
        filterSummary,
        page: 0,
        createdAt: Date.now(),
    };
    sessions.set(session.id, session);
    return session;
}
// ── Rendu ─────────────────────────────────────────────────────────────────────
function buildStatusLines(session) {
    return session.outcome.statuses.map((status) => status.ok
        ? `✅ ${supported_chain_1.CHAIN_DISPLAY_NAMES[status.chain]} : OK`
        : `⚠️ ${supported_chain_1.CHAIN_DISPLAY_NAMES[status.chain]} : temporairement indisponible (résultats servis depuis le cache)`);
}
function buildTransactionField(tx) {
    const symbol = tx.tokenSymbol ?? "?";
    const usd = tx.amountUsd !== undefined ? ` (~$${tx.amountUsd.toFixed(2)})` : "";
    const directionLabel = tx.direction === "incoming"
        ? "📥 entrant"
        : tx.direction === "outgoing"
            ? "📤 sortant"
            : tx.direction;
    const lines = [
        `Wallet : **${tx.walletLabel ?? tx.walletAddress}**`,
        `Blockchain : ${supported_chain_1.CHAIN_DISPLAY_NAMES[tx.chain]} — ${directionLabel}`,
        `Date : ${(0, date_1.formatDateUtc)(tx.timestamp)} — Heure : ${(0, date_1.formatTimeUtc)(tx.timestamp)} UTC`,
        `From : \`${tx.from}\``,
        ...(tx.to ? [`To : \`${tx.to}\``] : []),
        `[Transaction](${tx.explorerUrl})`,
    ];
    return {
        name: `💰 ${(0, format_1.formatAmount)(tx.amount)} ${symbol}${usd}`.slice(0, 256),
        value: lines.join("\n").slice(0, 1024),
    };
}
function buildSearchView(session) {
    const { transactions } = session.outcome;
    const total = transactions.length;
    const pageCount = Math.max(1, Math.ceil(total / exports.PAGE_SIZE));
    session.page = Math.min(Math.max(session.page, 0), pageCount - 1);
    const start = session.page * exports.PAGE_SIZE;
    const pageTransactions = transactions.slice(start, start + exports.PAGE_SIZE);
    const descriptionParts = [...buildStatusLines(session)];
    if (session.filterSummary.length > 0) {
        descriptionParts.push("", "**Filtres :**", ...session.filterSummary);
    }
    if (total > 0) {
        descriptionParts.push("", `**Résultats ${start + 1}-${start + pageTransactions.length} / ${total}**`);
    }
    else {
        descriptionParts.push("", "Aucune transaction ne correspond aux filtres.");
    }
    const header = new discord_js_1.EmbedBuilder()
        .setTitle(`🔎 ${total} transaction${total > 1 ? "s" : ""} trouvée${total > 1 ? "s" : ""}`)
        .setDescription(descriptionParts.join("\n").slice(0, 4096))
        .setColor(total > 0 ? 0x2ecc71 : 0x95a5a6)
        .setTimestamp(new Date());
    if (pageTransactions.length > 0) {
        header.addFields(pageTransactions.map(buildTransactionField));
    }
    const components = [];
    if (total > 0) {
        components.push(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`search:prev:${session.id}`)
            .setLabel("⬅️ Previous")
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setDisabled(session.page === 0), new discord_js_1.ButtonBuilder()
            .setCustomId(`search:page:${session.id}`)
            .setLabel(`Page ${session.page + 1}/${pageCount}`)
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setDisabled(true), new discord_js_1.ButtonBuilder()
            .setCustomId(`search:next:${session.id}`)
            .setLabel("➡️ Next")
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setDisabled(session.page >= pageCount - 1), new discord_js_1.ButtonBuilder()
            .setCustomId(`search:csv:${session.id}`)
            .setLabel("📄 Export CSV")
            .setStyle(discord_js_1.ButtonStyle.Primary)));
    }
    return { embeds: [header], components };
}
// ── Interactions boutons ──────────────────────────────────────────────────────
function isSearchButton(customId) {
    return customId.startsWith("search:");
}
async function handleSearchButton(interaction) {
    const [, action, sessionId] = interaction.customId.split(":");
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) {
        await interaction.reply({
            content: "⌛ Cette session de recherche a expiré. Relance `/search`.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (interaction.user.id !== session.discordUserId) {
        await interaction.reply({
            content: "Cette recherche appartient à un autre utilisateur.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    switch (action) {
        case "prev":
            session.page -= 1;
            await interaction.update(buildSearchView(session));
            return;
        case "next":
            session.page += 1;
            await interaction.update(buildSearchView(session));
            return;
        case "csv": {
            const csv = (0, csv_1.transactionsToCsv)(session.outcome.transactions);
            const file = new discord_js_1.AttachmentBuilder(Buffer.from(csv, "utf8"), {
                name: `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
            });
            await interaction.reply({
                content: `📄 Export CSV — ${session.outcome.transactions.length} transaction(s).`,
                files: [file],
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        default:
            await interaction.deferUpdate();
    }
}
//# sourceMappingURL=pagination.js.map