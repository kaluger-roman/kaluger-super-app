"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateWebSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const url_1 = require("url");
const authenticateWebSocket = async (ws, request) => {
    try {
        // Extract token from query parameters
        const { query } = (0, url_1.parse)(request.url || "", true);
        const token = query.token;
        if (!token) {
            console.log("WebSocket connection rejected: No token provided");
            ws.close(1008, "No token provided");
            return null;
        }
        // Verify JWT token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback-secret");
        return decoded;
    }
    catch (error) {
        console.error("WebSocket authentication error:", error);
        ws.close(1008, "Authentication failed");
        return null;
    }
};
exports.authenticateWebSocket = authenticateWebSocket;
//# sourceMappingURL=auth.js.map