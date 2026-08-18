"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const env_1 = require("./config/env");
const export_1 = require("./bot/commands/export");
const search_1 = require("./bot/commands/search");
const wallet_1 = require("./bot/commands/wallet");
/**
 * Enregistrement des commandes slash auprès de Discord.
 *   npm run register-commands
 * Avec DISCORD_GUILD_ID : commandes de serveur (visibles immédiatement).
 * Sans : commandes globales (propagation ~1 h).
 */
async function main() {
    const commands = [wallet_1.walletCommand, search_1.searchCommand, export_1.exportCommand].map((command) => command.data.toJSON());
    const rest = new discord_js_1.REST().setToken(env_1.env.DISCORD_TOKEN);
    if (env_1.env.DISCORD_GUILD_ID) {
        await rest.put(discord_js_1.Routes.applicationGuildCommands(env_1.env.DISCORD_CLIENT_ID, env_1.env.DISCORD_GUILD_ID), { body: commands });
        console.log(`✅ ${commands.length} commandes enregistrées sur le serveur ${env_1.env.DISCORD_GUILD_ID}.`);
    }
    else {
        await rest.put(discord_js_1.Routes.applicationCommands(env_1.env.DISCORD_CLIENT_ID), {
            body: commands,
        });
        console.log(`✅ ${commands.length} commandes globales enregistrées (propagation ~1 h).`);
    }
}
main().catch((error) => {
    console.error("❌ Échec de l'enregistrement des commandes :", error);
    process.exit(1);
});
//# sourceMappingURL=register-commands.js.map