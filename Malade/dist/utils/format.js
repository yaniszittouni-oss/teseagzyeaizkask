"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortenAddress = shortenAddress;
exports.formatAmount = formatAmount;
/** Raccourcit une adresse pour l'affichage : "0x1234…abcd". */
function shortenAddress(address, visibleChars = 6) {
    if (address.length <= visibleChars * 2 + 1)
        return address;
    return `${address.slice(0, visibleChars)}…${address.slice(-4)}`;
}
/**
 * Formate un montant décimal pour l'affichage Discord :
 * séparateurs de milliers + fraction limitée à 6 chiffres significatifs.
 * Le montant source reste une chaîne : aucune conversion flottante destructive.
 */
function formatAmount(amount) {
    const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(amount.trim());
    if (!match)
        return amount;
    const sign = match[1] ?? "";
    const integer = (match[2] ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    let fraction = (match[3] ?? "").slice(0, 6).replace(/0+$/, "");
    // Pour les poussières (< 0.000001), garde une indication plutôt que "0".
    if (integer === "0" && fraction === "" && (match[3] ?? "").length > 0) {
        fraction = "000000";
    }
    return fraction ? `${sign}${integer}.${fraction}` : `${sign}${integer}`;
}
//# sourceMappingURL=format.js.map