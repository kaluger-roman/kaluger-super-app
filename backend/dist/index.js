"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const node_cron_1 = __importDefault(require("node-cron"));
const http_1 = require("http");
const prisma_1 = __importDefault(require("./lib/prisma"));
exports.prisma = prisma_1.default;
const websocket_1 = require("./lib/websocket");
const wsManager_1 = require("./lib/wsManager");
const recurringLessons_1 = require("./services/recurringLessons");
const lessonStatusUpdater_1 = require("./services/lessonStatusUpdater");
const auth_1 = __importDefault(require("./routes/auth"));
const students_1 = __importDefault(require("./routes/students"));
const lessons_1 = __importDefault(require("./routes/lessons"));
const statistics_1 = __importDefault(require("./routes/statistics"));
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/students", students_1.default);
app.use("/api/lessons", lessons_1.default);
app.use("/api/statistics", statistics_1.default);
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});
// 404 handler
app.use("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
});
const PORT = process.env.PORT || 3001;
// Create HTTP server and WebSocket manager
let server = null;
if (process.env.NODE_ENV !== "test") {
    server = (0, http_1.createServer)(app);
    const wsManager = new websocket_1.WebSocketManager(server);
    (0, wsManager_1.setWebSocketManager)(wsManager);
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
        node_cron_1.default.schedule("0 2 * * *", async () => {
            console.log("Running recurring lessons processing job...");
            try {
                await (0, recurringLessons_1.processRecurringLessons)();
            }
            catch (error) {
                console.error("Error in recurring lessons cron job:", error);
            }
        });
        node_cron_1.default.schedule("* * * * *", async () => {
            try {
                await (0, lessonStatusUpdater_1.updateLessonStatuses)();
            }
            catch (error) {
                console.error("Error in lesson status update cron job:", error);
            }
        });
        console.log("Cron jobs scheduled:");
        console.log("- Recurring lessons: Daily at 2 AM");
        console.log("- Lesson status updates: Every minute");
    });
}
// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    if (server) {
        server.close(() => {
            prisma_1.default.$disconnect();
            console.log("Process terminated");
        });
    }
    else {
        prisma_1.default.$disconnect();
        console.log("Process terminated");
    }
});
//# sourceMappingURL=index.js.map