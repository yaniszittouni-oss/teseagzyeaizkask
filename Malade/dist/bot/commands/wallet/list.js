"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWalletList = executeWalletList;
const discord_js_1 = require("discord.js");
const supported_chain_1 = require("../../../blockchain/types/supported-chain");
const prisma_1 = require("../../../database/prisma");
/** /wallet list — tous les wallets de l'utilisateur, groupés par blockchain. */
async function executeWalletList(interaction) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { wallets: { orderBy: [{ chain: "asc" }, { createdAt: "asc" }] } },
    });
    const wallets = user?.wallets ?? [];
    if (wallets.length === 0) {
        await interaction.reply({
            content: "Tu n'as aucun wallet enregistré. Ajoute-en un avec `/wallet add`.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`👛 Tes wallets (${wallets.length})`)
        .setColor(0x3498db);
    for (const chain of supported_chain_1.SUPPORTED_CHAINS) {
        const chainWallets = wallets.filter((w) => w.chain === chain);
        if (chainWallets.length === 0)
            continue;
        embed.addFields({
            name: `${supported_chain_1.CHAIN_DISPLAY_NAMES[chain]} (${chainWallets.length})`,
            value: chainWallets
                .map((w) => `• **${w.label}**\n  \`${w.address}\``)
                .join("\n")
                .slice(0, 1024),
        });
    }
    await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
}
//# sourceMappingURL=list.js.map