"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const numeral = require("numeral");
function flatten(ary) {
    return ary.reduce((p, c) => (Array.isArray(c) ? p.concat(flatten(c)) : p.concat(c)), []);
}
exports.flatten = flatten;
function humanizeDollar(num) {
    return numeral(num).format("$0,0.00");
}
exports.humanizeDollar = humanizeDollar;
