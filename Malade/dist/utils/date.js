"use strict";
/**
 * Toutes les dates du bot sont stockées et manipulées en UTC.
 * Les timestamps blockchain (secondes Unix, blockTime Solana...) sont
 * convertis en `Date` UTC dès la normalisation ; les filtres date/heure
 * s'appliquent ensuite dans le moteur interne, jamais côté explorer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDateInput = parseDateInput;
exports.parseTimeInput = parseTimeInput;
exports.minutesOfDayUtc = minutesOfDayUtc;
exports.formatDateUtc = formatDateUtc;
exports.formatTimeUtc = formatTimeUtc;
exports.toIsoUtc = toIsoUtc;
/** Parse "YYYY-MM-DD" en Date UTC (minuit, ou 23:59:59.999 si endOfDay). */
function parseDateInput(input, endOfDay = false) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
    if (!match)
        return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    // Rejette les dates invalides du type 2026-02-31 (JS "roule" sinon).
    if (date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day) {
        return null;
    }
    if (endOfDay)
        date.setUTCHours(23, 59, 59, 999);
    return date;
}
/** Parse "HH:mm" en minutes depuis minuit (UTC). Retourne null si invalide. */
function parseTimeInput(input) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
    if (!match)
        return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59)
        return null;
    return hours * 60 + minutes;
}
/** Minutes écoulées depuis minuit UTC pour un timestamp donné. */
function minutesOfDayUtc(date) {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
}
/** "14/08/2026" */
function formatDateUtc(date) {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getUTCFullYear()}`;
}
/** "13:42:51" */
function formatTimeUtc(date) {
    const h = String(date.getUTCHours()).padStart(2, "0");
    const m = String(date.getUTCMinutes()).padStart(2, "0");
    const s = String(date.getUTCSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
}
/** "2026-08-14T13:42:51Z" (format interne / exports). */
function toIsoUtc(date) {
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
//# sourceMappingURL=date.js.map