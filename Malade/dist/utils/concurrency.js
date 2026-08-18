"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunk = chunk;
exports.mapWithConcurrency = mapWithConcurrency;
/** Découpe un tableau en morceaux de taille `size`. */
function chunk(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}
/**
 * Applique `fn` sur chaque élément avec une concurrence maximale de `limit`.
 *
 * Comportement de type Promise.allSettled : une tâche qui échoue ne fait
 * jamais échouer les autres — indispensable pour qu'une API indisponible
 * (ex. Solana down) ne casse pas toute la recherche multi-chain.
 */
async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let nextIndex = 0;
    async function worker() {
        while (true) {
            const index = nextIndex++;
            if (index >= items.length)
                return;
            const item = items[index];
            try {
                results[index] = { status: "fulfilled", value: await fn(item, index) };
            }
            catch (reason) {
                results[index] = { status: "rejected", reason };
            }
        }
    }
    const workerCount = Math.max(1, Math.min(limit, items.length));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
}
//# sourceMappingURL=concurrency.js.map