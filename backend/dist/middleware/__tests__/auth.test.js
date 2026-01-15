"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Mock verifyToken from utils/auth
jest.mock("../../utils/auth", () => ({
    verifyToken: jest.fn(),
}));
const auth_1 = require("../../utils/auth");
const auth_2 = require("../auth");
const app = (0, express_1.default)();
app.get("/protected", auth_2.authenticateToken, (req, res) => {
    res.json({ ok: true, user: req.user });
});
describe("authenticateToken middleware", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    it("should return 401 when Authorization header is missing", async () => {
        const res = await (0, supertest_1.default)(app).get("/protected");
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Токен доступа обязателен" });
    });
    it("should return 401 when Authorization header has no token", async () => {
        const res = await (0, supertest_1.default)(app)
            .get("/protected")
            .set("Authorization", "Bearer");
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Токен доступа обязателен" });
    });
    it("should return 403 when verifyToken returns falsy", async () => {
        auth_1.verifyToken.mockReturnValue(null);
        const res = await (0, supertest_1.default)(app)
            .get("/protected")
            .set("Authorization", "Bearer invalid-token");
        expect(auth_1.verifyToken).toHaveBeenCalledWith("invalid-token");
        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Недействительный или истекший токен" });
    });
    it("should call next and attach user when verifyToken returns payload", async () => {
        const fakePayload = { userId: "user-1", email: "a@b.c" };
        auth_1.verifyToken.mockReturnValue(fakePayload);
        const res = await (0, supertest_1.default)(app)
            .get("/protected")
            .set("Authorization", "Bearer valid-token");
        expect(auth_1.verifyToken).toHaveBeenCalledWith("valid-token");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true, user: fakePayload });
    });
});
//# sourceMappingURL=auth.test.js.map