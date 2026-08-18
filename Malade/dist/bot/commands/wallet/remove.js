"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWalletRemove = executeWalletRemove;
const discord_js_1 = require("discord.js");
const supported_chain_1 = require("../../../blockchain/types/supported-chain");
const prisma_1 = require("../../../database/prisma");
const format_1 = require("../../../utils/format");
/**
 * /wallet remove wallet:<sélection>
 *
 * L'option `wallet` est autocomplétée avec les wallets de l'utilisateur
 * (valeur = id interne). En secours, une adresse collée telle quelle est
 * également acceptée.
 */
async function executeWalletRemove(interaction) {
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
    // Par id (autocomplete) puis par adresse (saisie manuelle).
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
    await prisma_1.prisma.wallet.delete({ where: { id: wallet.id } });
    await interaction.reply({
        content: `🗑️ Wallet supprimé : **${wallet.label}** — ${supported_chain_1.CHAIN_DISPLAY_NAMES[wallet.chain]} (\`${(0, format_1.shortenAddress)(wallet.address)}\`).`,
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
}
//# sourceMappingURL=remove.js.map