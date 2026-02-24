"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const utils_1 = require("../utils");
const prisma_1 = __importDefault(require("../lib/prisma"));
const services_1 = require("../services");
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Validation
        if (!email || !password || !name) {
            return res
                .status(400)
                .json({ error: "Email, пароль и имя обязательны для заполнения" });
        }
        if (!(0, utils_1.validateEmail)(email)) {
            return res.status(400).json({ error: "Неверный формат email" });
        }
        if (!(0, utils_1.validatePassword)(password)) {
            return res.status(400).json({
                error: "Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, а также цифры",
            });
        }
        // Check if user already exists
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(409).json({ error: "Пользователь уже существует" });
        }
        // Create user
        const hashedPassword = await (0, utils_1.hashPassword)(password);
        const verificationCode = (0, utils_1.generateVerificationCode)();
        const verificationCodeExpiry = (0, utils_1.getVerificationCodeExpiry)();
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                verificationCode,
                verificationCodeExpiry,
                isEmailVerified: false,
            },
        });
        // Send verification email
        try {
            await (0, services_1.sendVerificationEmail)(email, verificationCode);
        }
        catch (emailError) {
            console.error("Error sending verification email:", emailError);
            // Продолжаем даже если письмо не отправилось
        }
        res.status(201).json({
            message: "Пользователь успешно создан. Проверьте email для подтверждения регистрации",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isEmailVerified: user.isEmailVerified,
                taxRate: user.taxRate,
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Email и пароль обязательны для заполнения" });
        }
        // Find user
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ error: "Неверные учетные данные" });
        }
        // Check password
        const isPasswordValid = await (0, utils_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Неверные учетные данные" });
        }
        // Check email verification
        if (!user.isEmailVerified) {
            return res.status(403).json({
                error: "Email не подтвержден. Проверьте почту или запросите новый код подтверждения",
            });
        }
        // Generate token
        const token = (0, utils_1.generateToken)({ userId: user.id, email: user.email });
        res.json({
            message: "Вход выполнен успешно",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                taxRate: user.taxRate,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                isEmailVerified: true,
                taxRate: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        res.json({ user });
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { name, taxRate } = req.body;
        if (name !== undefined && (!name || name.trim().length === 0)) {
            return res.status(400).json({ error: "Имя не может быть пустым" });
        }
        if (taxRate !== undefined) {
            if (typeof taxRate !== "number" || taxRate < 0 || taxRate > 100) {
                return res
                    .status(400)
                    .json({ error: "Ставка налога должна быть от 0 до 100" });
            }
        }
        const data = {};
        if (name !== undefined)
            data.name = name.trim();
        if (taxRate !== undefined)
            data.taxRate = Math.round(taxRate * 10) / 10;
        const user = await prisma_1.default.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                isEmailVerified: true,
                taxRate: true,
            },
        });
        res.json({ message: "Профиль успешно обновлен", user });
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=auth.js.map