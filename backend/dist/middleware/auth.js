"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const auth_1 = require("../utils/auth");
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Токен доступа обязателен" });
    }
    const payload = (0, auth_1.verifyToken)(token);
    if (!payload) {
        return res
            .status(403)
            .json({ error: "Недействительный или истекший токен" });
    }
    req.user = payload;
    next();
};
exports.authenticateToken = authenticateToken;
//# sourceMappingURL=auth.js.map