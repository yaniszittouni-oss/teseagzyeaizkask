"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWalletInfo = executeWalletInfo;
const discord_js_1 = require("discord.js");
const supported_chain_1 = require("../../../blockchain/types/supported-chain");
const prisma_1 = require("../../../database/prisma");
const cache_service_1 = require("../../../services/cache.service");
const date_1 = require("../../../utils/date");
/** URL de l'adresse (pas d'une transaction) sur l'explorer officiel. */
const EXPLORER_ADDRESS_URLS = {
    ethereum: (a) => `https://etherscan.io/address/${a}`,
    base: (a) => `https://basescan.org/address/${a}`,
    solana: (a) => `https://solscan.io/account/${a}`,
    bnb: (a) => `https://bscscan.com/address/${a}`,
    arbitrum: (a) => `https://arbiscan.io/address/${a}`,
};
/** /wallet info wallet:<sélection> — détails d'un wallet enregistré. */
async function executeWalletInfo(interaction) {
    const selection = interaction.options.getString("wallet", true).trim();
    const user = await prisma_1.prisma.user.findUnique({
        where: { discordId: interaction.user.id },
    });
    if (!user) {
        await interaction.reply({
            content: "Tu n'as aucun wallet enregistré.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const wallet = await prisma_1.prisma.wallet.findFirst({
        where: {
            userId: user.id,
            OR: [
                { id: selection },
                { address: { equals: selection, mode: "insensitive" } },
            ],
        },
    });
    if (!wallet) {
        await interaction.reply({
            content: "❌ Wallet introuvable. Utilise l'autocomplétion ou colle l'adresse exacte.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const chain = wallet.chain;
    const cachedCount = await cache_service_1.cacheService.countCachedTransactions(wallet);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`👛 ${wallet.label}`)
        .setColor(0x3498db)
        .addFields({ name: "Blockchain", value: supported_chain_1.CHAIN_DISPLAY_NAMES[chain], inline: true }, {
        name: "Ajouté le",
        value: `${(0, date_1.formatDateUtc)(wallet.createdAt)} ${(0, date_1.formatTimeUtc)(wallet.createdAt)} UTC`,
        inline: true,
    }, { name: "Adresse", value: `\`${wallet.address}\`` }, {
        name: "Transactions indexées",
        value: String(cachedCount),
        inline: true,
    }, {
        name: "Dernière synchro",
        value: wallet.lastSyncedAt
            ? `${(0, date_1.formatDateUtc)(wallet.lastSyncedAt)} ${(0, date_1.formatTimeUtc)(wallet.lastSyncedAt)} UTC`
            : "jamais",
        inline: true,
    }, {
        name: "Explorer",
        value: `[Voir l'adresse](${EXPLORER_ADDRESS_URLS[chain](wallet.address)})`,
    });
    await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
}
//# sourceMappingURL=info.js.map