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
import { validateRequiredEnv } from "./utils/validateEnv";

if (process.env.NODE_ENV !== "test") {
  validateRequiredEnv();
}

import { authRouter } from "./routes/auth";
import { studentsRouter } from "./routes/students";
import { lessonsRouter } from "./routes/lessons";
import { statisticsRouter } from "./routes/statistics";
import { newsRouter } from "./routes/news";
import { pushRouter } from "./routes/push";
import { reminderSettingsRouter } from "./routes/reminderSettings";
import { adminRouter } from "./routes/admin";
import { taxPeriodsRouter } from "./routes/taxPeriods";
import { testRouter } from "./routes/__test__";
import { studentAuthRouter } from "./routes/studentAuth";
import { studentInvitationsRouter } from "./routes/studentInvitations";
import { studentCabinetRouter } from "./routes/studentCabinet";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/statistics", statisticsRouter);
app.use("/api/news", newsRouter);
app.use("/api/push", pushRouter);
app.use("/api/reminder-settings", reminderSettingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/tax-periods", taxPeriodsRouter);
app.use("/api/student-auth", studentAuthRouter);
app.use("/api/student-invitations", studentInvitationsRouter);
app.use("/api/student-cabinet", studentCabinetRouter);

if (process.env.NODE_ENV === "test") {
  app.use("/api/__test__", testRouter);
}

// Health check — verifies DB connectivity so monitoring can detect outages
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({
      status: "ERROR",
      reason: "database_unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  },
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
    console.log(
      `Student WebSocket server available at ws://localhost:${PORT}/ws/student`,
    );

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
      { timezone: CRON_TIMEZONE },
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
      { timezone: CRON_TIMEZONE },
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
      { timezone: CRON_TIMEZONE },
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
      { timezone: CRON_TIMEZONE },
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
