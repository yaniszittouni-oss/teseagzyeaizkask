"use strict";
/**
 * Comparaison décimale exacte, sans passer par les flottants JavaScript.
 *
 * Les montants blockchain sont stockés en chaînes décimales ("4350.25").
 * Pour appliquer les filtres min/max sans perte de précision, on aligne les
 * deux valeurs sur la même échelle puis on compare des BigInt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareDecimal = compareDecimal;
function toParts(value) {
    let str = typeof value === "number" ? String(value) : value.trim();
    if (str.length === 0)
        return null;
    // Les très grands nombres JS peuvent être sérialisés en notation
    // scientifique ("1e+21") : on les re-développe.
    if (/e/i.test(str)) {
        const num = Number(str);
        if (!Number.isFinite(num))
            return null;
        str = num.toLocaleString("en-US", {
            useGrouping: false,
            maximumFractionDigits: 20,
        });
    }
    const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(str);
    if (!match)
        return null;
    return {
        negative: Boolean(match[1]),
        integer: match[2] ?? "0",
        fraction: match[3] ?? "",
    };
}
/**
 * Compare deux nombres décimaux. Retourne -1 si a < b, 0 si égaux, 1 si a > b.
 * Retourne null si l'une des valeurs n'est pas un nombre décimal valide.
 */
function compareDecimal(a, b) {
    const pa = toParts(a);
    const pb = toParts(b);
    if (!pa || !pb)
        return null;
    const scale = Math.max(pa.fraction.length, pb.fraction.length);
    const bigA = BigInt(pa.integer + pa.fraction.padEnd(scale, "0")) * (pa.negative ? -1n : 1n);
    const bigB = BigInt(pb.integer + pb.fraction.padEnd(scale, "0")) * (pb.negative ? -1n : 1n);
    if (bigA < bigB)
        return -1;
    if (bigA > bigB)
        return 1;
    return 0;
}
//# sourceMappingURL=decimal.js.map