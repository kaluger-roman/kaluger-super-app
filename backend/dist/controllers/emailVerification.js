"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerification = exports.verifyEmail = void 0;
const utils_1 = require("../utils");
const prisma_1 = __importDefault(require("../lib/prisma"));
const services_1 = require("../services");
const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res
                .status(400)
                .json({ error: "Email и код подтверждения обязательны" });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ error: "Email уже подтвержден" });
        }
        if (!user.verificationCode || !user.verificationCodeExpiry) {
            return res
                .status(400)
                .json({ error: "Код подтверждения не найден. Запросите новый код" });
        }
        if ((0, utils_1.isVerificationCodeExpired)(user.verificationCodeExpiry)) {
            return res.status(400).json({
                error: "Срок действия кода истек. Запросите новый код",
            });
        }
        if (user.verificationCode !== code) {
            return res.status(400).json({ error: "Неверный код подтверждения" });
        }
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                verificationCode: null,
                verificationCodeExpiry: null,
            },
        });
        const token = (0, utils_1.generateToken)({ userId: user.id, email: user.email });
        res.json({
            message: "Email успешно подтвержден",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isEmailVerified: true,
                taxRate: user.taxRate,
            },
        });
    }
    catch (error) {
        console.error("Verify email error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.verifyEmail = verifyEmail;
const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email обязателен" });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ error: "Email уже подтвержден" });
        }
        const verificationCode = (0, utils_1.generateVerificationCode)();
        const verificationCodeExpiry = (0, utils_1.getVerificationCodeExpiry)();
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: {
                verificationCode,
                verificationCodeExpiry,
            },
        });
        try {
            await (0, services_1.sendVerificationEmail)(email, verificationCode);
        }
        catch (emailError) {
            console.error("Error sending verification email:", emailError);
            return res
                .status(500)
                .json({ error: "Ошибка отправки письма. Попробуйте позже" });
        }
        res.json({
            message: "Код подтверждения отправлен на email",
        });
    }
    catch (error) {
        console.error("Resend verification error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.resendVerification = resendVerification;
//# sourceMappingURL=emailVerification.js.map