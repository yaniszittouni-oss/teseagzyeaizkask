"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
/**
 * Validation stricte de l'environnement au démarrage (Zod).
 * Le process refuse de démarrer si une variable obligatoire manque :
 * on échoue tôt plutôt qu'au milieu d'une commande Discord.
 */
const envSchema = zod_1.z.object({
    DISCORD_TOKEN: zod_1.z.string().min(1, "DISCORD_TOKEN est obligatoire"),
    DISCORD_CLIENT_ID: zod_1.z.string().min(1, "DISCORD_CLIENT_ID est obligatoire"),
    DISCORD_GUILD_ID: zod_1.z.string().optional(),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL est obligatoire"),
    ETHEREUM_RPC_URL: zod_1.z.string().url().default("https://eth.llamarpc.com"),
    BASE_RPC_URL: zod_1.z.string().url().default("https://mainnet.base.org"),
    SOLANA_RPC_URL: zod_1.z.string().url().default("https://api.mainnet-beta.solana.com"),
    BNB_RPC_URL: zod_1.z.string().url().default("https://bsc-dataseed.bnbchain.org"),
    ARBITRUM_RPC_URL: zod_1.z.string().url().default("https://arb1.arbitrum.io/rpc"),
    // Etherscan API V2 : une seule clé pour Ethereum, Base, BNB et Arbitrum.
    ETHERSCAN_API_KEY: zod_1.z.string().optional(),
    // Clés héritées par chaîne (optionnelles, prioritaires si présentes).
    BASESCAN_API_KEY: zod_1.z.string().optional(),
    BSCSCAN_API_KEY: zod_1.z.string().optional(),
    ARBISCAN_API_KEY: zod_1.z.string().optional(),
    // Réservée à une future intégration Solscan Pro (provider remplaçable).
    SOLSCAN_API_KEY: zod_1.z.string().optional(),
    CACHE_TTL_SECONDS: zod_1.z.coerce.number().int().positive().default(60),
    SEARCH_CONCURRENCY: zod_1.z.coerce.number().int().min(1).max(20).default(4),
    MAX_TX_PER_FETCH: zod_1.z.coerce.number().int().min(10).max(2000).default(500),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("❌ Configuration invalide :");
    for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map