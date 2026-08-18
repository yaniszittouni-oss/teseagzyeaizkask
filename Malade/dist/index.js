"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const env_1 = require("./config/env");
const prisma_1 = require("./database/prisma");
const export_1 = require("./bot/commands/export");
const search_1 = require("./bot/commands/search");
const wallet_1 = require("./bot/commands/wallet");
const pagination_1 = require("./bot/interactions/pagination");
/**
 * Point d'entrée du bot.
 *
 * SÉCURITÉ — le bot est strictement READ-ONLY : il ne manipule que des
 * données publiques on-chain. Il ne demande, ne stocke et n'utilise JAMAIS
 * de seed phrase ou de clé privée, ne signe et n'envoie aucune transaction,
 * et ne peut déplacer aucun fonds.
 */
const commands = new Map([wallet_1.walletCommand, search_1.searchCommand, export_1.exportCommand].map((command) => [
    command.data.name,
    command,
]));
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
client.once(discord_js_1.Events.ClientReady, (readyClient) => {
    console.log(`✅ Connecté en tant que ${readyClient.user.tag}`);
});
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = commands.get(interaction.commandName);
            if (!command)
                return;
            await command.execute(interaction);
            return;
        }
        if (interaction.isAutocomplete()) {
            const command = commands.get(interaction.commandName);
            if (command?.autocomplete) {
                await command.autocomplete(interaction);
            }
            return;
        }
        if (interaction.isButton() && (0, pagination_1.isSearchButton)(interaction.customId)) {
            await (0, pagination_1.handleSearchButton)(interaction);
            return;
        }
    }
    catch (error) {
        console.error("Erreur lors du traitement d'une interaction :", error);
        // Toujours répondre quelque chose à l'utilisateur, sans fuiter de détails.
        if (interaction.isChatInputCommand() || interaction.isButton()) {
            const message = {
                content: "❌ Une erreur interne est survenue. Réessaie dans un instant.",
                flags: discord_js_1.MessageFlags.Ephemeral,
            };
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp(message);
                }
                else {
                    await interaction.reply(message);
                }
            }
            catch {
                // L'interaction a expiré : rien de plus à faire.
            }
        }
    }
});
async function shutdown() {
    console.log("Arrêt du bot…");
    await client.destroy();
    await prisma_1.prisma.$disconnect();
    process.exit(0);
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
void client.login(env_1.env.DISCORD_TOKEN);
//# sourceMappingURL=index.js.map