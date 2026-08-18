"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCommand = void 0;
const discord_js_1 = require("discord.js");
const transaction_search_service_1 = require("../../search/transaction-search.service");
const pagination_1 = require("../interactions/pagination");
const filter_options_1 = require("./filter-options");
/**
 * /search — recherche les transactions de TOUS les wallets enregistrés de
 * l'utilisateur, toutes chaînes confondues, avec les filtres combinables :
 * min_amount, max_amount, from_date, to_date, from_time, to_time, chain,
 * token, min_usd, max_usd, direction.
 *
 * Pipeline : récupération (cache + fetch incrémental, concurrence bornée)
 * → normalisation → fusion → moteur de filtres interne → tri décroissant
 * → pagination Discord. Une chaîne indisponible est signalée en ⚠️ mais
 * n'empêche jamais l'affichage des autres résultats.
 */
const data = (0, filter_options_1.addSearchFilterOptions)(new discord_js_1.SlashCommandBuilder()
    .setName("search")
    .setDescription("Rechercher les transactions de tous tes wallets enregistrés"));
async function execute(interaction) {
    const parsed = (0, filter_options_1.parseSearchFilters)(interaction);
    if (!parsed.ok) {
        await interaction.reply({
            content: `❌ ${parsed.error}`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    // La recherche multi-chain peut dépasser les 3 s d'une réponse immédiate.
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const outcome = await (0, transaction_search_service_1.searchTransactions)(interaction.user.id, parsed.filters);
    if (outcome.totalWallets === 0) {
        await interaction.editReply({
            content: "Tu n'as aucun wallet enregistré" +
                (parsed.filters.chains?.length ? " sur cette blockchain" : "") +
                ". Ajoute-en un avec `/wallet add`.",
        });
        return;
    }
    const session = (0, pagination_1.createSearchSession)(interaction.user.id, outcome, (0, filter_options_1.describeFilters)(parsed.filters));
    await interaction.editReply((0, pagination_1.buildSearchView)(session));
}
exports.searchCommand = { data, execute };
//# sourceMappingURL=search.js.map