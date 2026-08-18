"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletCommand = void 0;
const discord_js_1 = require("discord.js");
const supported_chain_1 = require("../../../blockchain/types/supported-chain");
const prisma_1 = require("../../../database/prisma");
const format_1 = require("../../../utils/format");
const add_1 = require("./add");
const info_1 = require("./info");
const list_1 = require("./list");
const remove_1 = require("./remove");
/**
 * /wallet — gestion des adresses enregistrées.
 * Sous-commandes : add, remove, list, info.
 */
const CHAIN_CHOICES = supported_chain_1.SUPPORTED_CHAINS.map((chain) => ({
    name: supported_chain_1.CHAIN_DISPLAY_NAMES[chain],
    value: chain,
}));
const data = new discord_js_1.SlashCommandBuilder()
    .setName("wallet")
    .setDescription("Gérer tes adresses blockchain enregistrées")
    .addSubcommand((sub) => sub
    .setName("add")
    .setDescription("Enregistrer une adresse blockchain")
    .addStringOption((option) => option
    .setName("chain")
    .setDescription("Blockchain de l'adresse")
    .setRequired(true)
    .addChoices(...CHAIN_CHOICES))
    .addStringOption((option) => option
    .setName("address")
    .setDescription("Adresse (0x… pour l'EVM, base58 pour Solana)")
    .setRequired(true))
    .addStringOption((option) => option
    .setName("label")
    .setDescription("Nom donné à ce wallet (ex. Binance Wallet)")
    .setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("remove")
    .setDescription("Supprimer un wallet enregistré")
    .addStringOption((option) => option
    .setName("wallet")
    .setDescription("Wallet à supprimer")
    .setRequired(true)
    .setAutocomplete(true)))
    .addSubcommand((sub) => sub.setName("list").setDescription("Voir tous tes wallets enregistrés"))
    .addSubcommand((sub) => sub
    .setName("info")
    .setDescription("Détails d'un wallet enregistré")
    .addStringOption((option) => option
    .setName("wallet")
    .setDescription("Wallet à inspecter")
    .setRequired(true)
    .setAutocomplete(true)));
async function execute(interaction) {
    switch (interaction.options.getSubcommand()) {
        case "add":
            return (0, add_1.executeWalletAdd)(interaction);
        case "remove":
            return (0, remove_1.executeWalletRemove)(interaction);
        case "list":
            return (0, list_1.executeWalletList)(interaction);
        case "info":
            return (0, info_1.executeWalletInfo)(interaction);
        default:
            throw new Error("Sous-commande inconnue");
    }
}
/** Autocomplétion de l'option `wallet` (remove/info) : wallets de l'auteur. */
async function autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const user = await prisma_1.prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { wallets: { orderBy: { createdAt: "asc" } } },
    });
    const choices = (user?.wallets ?? [])
        .filter((wallet) => wallet.label.toLowerCase().includes(focused) ||
        wallet.address.toLowerCase().includes(focused))
        .slice(0, 25)
        .map((wallet) => ({
        name: `${wallet.label} — ${supported_chain_1.CHAIN_DISPLAY_NAMES[wallet.chain]} — ${(0, format_1.shortenAddress)(wallet.address)}`.slice(0, 100),
        value: wallet.id,
    }));
    await interaction.respond(choices);
}
exports.walletCommand = { data, execute, autocomplete };
//# sourceMappingURL=index.js.map