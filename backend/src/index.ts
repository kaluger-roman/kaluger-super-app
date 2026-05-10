import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cron from "node-cron";
import { createServer } from "http";
import prisma from "./lib/prisma";
import { WebSocketManager } from "./lib/websocket";
import { setWebSocketManager } from "./lib/wsManager";
import { processRecurringLessons } from "./services/recurringLessons";
import { updateLessonStatuses } from "./services/lessonStatusUpdater";
import { processScheduledReminders, runBackupJob } from "./services";

import { authRouter } from "./routes/auth";
import studentRoutes from "./routes/students";
import lessonRoutes from "./routes/lessons";
import statisticsRoutes from "./routes/statistics";
import newsRoutes from "./routes/news";
import { pushRouter as pushRoutes } from "./routes/push";
import { reminderSettingsRouter as reminderSettingsRoutes } from "./routes/reminderSettings";
import { adminRouter as adminRoutes } from "./routes/admin";
import { screenRouter as screenRoutes } from "./routes/screen";
import { taxPeriodsRouter as taxPeriodsRoutes } from "./routes/taxPeriods";
import testRoutes from "./routes/__test__";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/students", studentRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/reminder-settings", reminderSettingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/screen", screenRoutes);
app.use("/api/tax-periods", taxPeriodsRoutes);

if (process.env.NODE_ENV === "test") {
  app.use("/api/__test__", testRoutes);
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 3001;

// Create HTTP server and WebSocket manager
const isTestEnv = process.env.NODE_ENV === "test";
const shouldStartServer = !isTestEnv || process.env.E2E === "1";
const shouldRunCrons = !isTestEnv;
let server: ReturnType<typeof createServer> | null = null;
if (shouldStartServer) {
  server = createServer(app);
  const wsManager = new WebSocketManager(server);

  setWebSocketManager(wsManager);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);

    if (!shouldRunCrons) {
      console.log("Cron jobs disabled (test mode)");
      return;
    }

    const CRON_TIMEZONE = "Europe/Moscow";

    cron.schedule(
      "0 2 * * *",
      async () => {
        console.log("Running recurring lessons processing job...");
        try {
          await processRecurringLessons();
        } catch (error) {
          console.error("Error in recurring lessons cron job:", error);
        }
      },
      { timezone: CRON_TIMEZONE }
    );

    cron.schedule(
      "* * * * *",
      async () => {
        try {
          await updateLessonStatuses();
        } catch (error) {
          console.error("Error in lesson status update cron job:", error);
        }
      },
      { timezone: CRON_TIMEZONE }
    );

    cron.schedule(
      "* * * * *",
      async () => {
        try {
          await processScheduledReminders();
        } catch (error) {
          console.error("Error in reminder processing cron job:", error);
        }
      },
      { timezone: CRON_TIMEZONE }
    );

    cron.schedule(
      "0 * * * *",
      async () => {
        try {
          await runBackupJob();
        } catch (error) {
          console.error("Error in database backup cron job:", error);
        }
      },
      { timezone: CRON_TIMEZONE }
    );

    console.log(`Cron jobs scheduled (timezone: ${CRON_TIMEZONE}):`);
    console.log("- Recurring lessons: Daily at 2 AM MSK");
    console.log("- Lesson status updates: Every minute");
    console.log("- Reminder processing: Every minute");
    console.log("- Database backup: Checked every hour");
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  if (server) {
    server.close(() => {
      prisma.$disconnect();
      console.log("Process terminated");
    });
  } else {
    prisma.$disconnect();
    console.log("Process terminated");
  }
});

export { app, prisma };
