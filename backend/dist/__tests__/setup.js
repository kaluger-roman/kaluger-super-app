"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const envPath = path_1.default.resolve(__dirname, "..", "..", ".env.test");
if (fs_1.default.existsSync(envPath))
    dotenv_1.default.config({ path: envPath });
// Basic Jest setup for backend tests
globals_1.jest.setTimeout(10000);
// Ensure Prisma disconnect after all tests if prisma is used
const prisma_1 = __importDefault(require("../lib/prisma"));
afterAll(async () => {
    try {
        await prisma_1.default.$disconnect();
    }
    catch (_) {
        // ignore
    }
});
//# sourceMappingURL=setup.js.map