"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = void 0;
exports.sleep = sleep;
exports.withTimeout = withTimeout;
exports.withRetry = withRetry;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
class TimeoutError extends Error {
    constructor(label, ms) {
        super(`${label} : délai de ${ms}ms dépassé`);
        this.name = "TimeoutError";
    }
}
exports.TimeoutError = TimeoutError;
/** Rejette si la promesse ne se résout pas dans le délai imparti. */
async function withTimeout(promise, ms, label = "opération") {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
            }),
        ]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
/**
 * Exécute `fn` avec retry, exponential backoff + jitter et timeout par
 * tentative. Utilisé par tous les providers pour absorber les erreurs
 * transitoires (rate limits, timeouts réseau, 5xx...).
 */
async function withRetry(fn, options = {}) {
    const { retries = 3, baseDelayMs = 500, maxDelayMs = 8_000, timeoutMs, shouldRetry = () => true, label = "requête", } = options;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const promise = fn();
            return timeoutMs ? await withTimeout(promise, timeoutMs, label) : await promise;
        }
        catch (error) {
            lastError = error;
            const isLastAttempt = attempt === retries;
            if (isLastAttempt || !shouldRetry(error))
                break;
            const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
            const jitter = Math.random() * exponential * 0.3;
            await sleep(exponential + jitter);
        }
    }
    throw lastError;
}
//# sourceMappingURL=retry.js.map