"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWalletAdd = executeWalletAdd;
const discord_js_1 = require("discord.js");
const client_1 = require("@prisma/client");
const provider_registry_1 = require("../../../blockchain/provider-registry");
const supported_chain_1 = require("../../../blockchain/types/supported-chain");
const prisma_1 = require("../../../database/prisma");
const format_1 = require("../../../utils/format");
/**
 * /wallet add chain:<blockchain> address:<adresse> label:<nom>
 *
 * Valide le format de l'adresse via le provider de la chaîne (EVM : adresse
 * 0x... ; Solana : clé publique base58), normalise les adresses EVM en
 * minuscules, et refuse les doublons (même utilisateur + même chaîne + même
 * adresse) grâce à la contrainte unique en base.
 */
async function executeWalletAdd(interaction) {
    const chainInput = interaction.options.getString("chain", true);
    const addressInput = interaction.options.getString("address", true).trim();
    const label = interaction.options.getString("label", true).trim();
    if (!(0, supported_chain_1.isSupportedChain)(chainInput)) {
        await interaction.reply({
            content: `❌ Blockchain non supportée : \`${chainInput}\`. Choix possibles : ethereum, base, solana, bnb, arbitrum.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const provider = (0, provider_registry_1.getProvider)(chainInput);
    if (!provider.validateAddress(addressInput)) {
        const expected = (0, supported_chain_1.isEvmChain)(chainInput)
            ? "une adresse EVM `0x…` (40 caractères hexadécimaux)"
            : "une clé publique Solana encodée en base58";
        await interaction.reply({
            content: `❌ Adresse invalide pour ${supported_chain_1.CHAIN_DISPLAY_NAMES[chainInput]} : attendu ${expected}.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (label.length === 0 || label.length > 64) {
        await interaction.reply({
            content: "❌ Le label doit contenir entre 1 et 64 caractères.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // Normalisation : les adresses EVM sont insensibles à la casse.
    const address = (0, supported_chain_1.isEvmChain)(chainInput) ? addressInput.toLowerCase() : addressInput;
    const user = await prisma_1.prisma.user.upsert({
        where: { discordId: interaction.user.id },
        update: {},
        create: { discordId: interaction.user.id },
    });
    try {
        const wallet = await prisma_1.prisma.wallet.create({
            data: { userId: user.id, chain: chainInput, address, label },
        });
        await interaction.reply({
            content: [
                `✅ Wallet enregistré !`,
                `**${wallet.label}** — ${supported_chain_1.CHAIN_DISPLAY_NAMES[chainInput]}`,
                `\`${wallet.address}\``,
            ].join("\n"),
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            await interaction.reply({
                content: `❌ Tu as déjà enregistré \`${(0, format_1.shortenAddress)(address)}\` sur ${supported_chain_1.CHAIN_DISPLAY_NAMES[chainInput]}.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        throw error;
    }
}
//# sourceMappingURL=add.js.map