"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.login = exports.register = void 0;
const auth_1 = require("../utils/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Validation
        if (!email || !password || !name) {
            return res
                .status(400)
                .json({ error: "Email, пароль и имя обязательны для заполнения" });
        }
        if (!(0, auth_1.validateEmail)(email)) {
            return res.status(400).json({ error: "Неверный формат email" });
        }
        if (!(0, auth_1.validatePassword)(password)) {
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
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });
        // Generate token
        const token = (0, auth_1.generateToken)({ userId: user.id, email: user.email });
        res.status(201).json({
            message: "Пользователь успешно создан",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
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
        const isPasswordValid = await (0, auth_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Неверные учетные данные" });
        }
        // Generate token
        const token = (0, auth_1.generateToken)({ userId: user.id, email: user.email });
        res.json({
            message: "Вход выполнен успешно",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
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
//# sourceMappingURL=auth.js.map