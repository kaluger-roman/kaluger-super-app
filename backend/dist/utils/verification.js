"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVerificationCodeExpired = exports.getVerificationCodeExpiry = exports.generateVerificationCode = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateVerificationCode = () => {
    return crypto_1.default.randomInt(100000, 999999).toString();
};
exports.generateVerificationCode = generateVerificationCode;
const getVerificationCodeExpiry = () => {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);
    return expiry;
};
exports.getVerificationCodeExpiry = getVerificationCodeExpiry;
const isVerificationCodeExpired = (expiry) => {
    return new Date() > expiry;
};
exports.isVerificationCodeExpired = isVerificationCodeExpired;
//# sourceMappingURL=verification.js.map