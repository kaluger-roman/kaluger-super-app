import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cron from "node-cron";
import prisma from "./lib/prisma";
import { processRecurringLessons } from "./services/recurringLessons";
import { updateLessonStatuses } from "./services/lessonStatusUpdater";

import authRoutes from "./routes/auth";
import studentRoutes from "./routes/students";
import lessonRoutes from "./routes/lessons";
import statisticsRoutes from "./routes/statistics";

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
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/statistics", statisticsRoutes);

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

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Setup cron job to process recurring lessons daily at 2 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("Running recurring lessons processing job...");
    try {
      await processRecurringLessons();
    } catch (error) {
      console.error("Error in recurring lessons cron job:", error);
    }
  });

  // Setup cron job to update lesson statuses every minute
  cron.schedule("* * * * *", async () => {
    try {
      await updateLessonStatuses();
    } catch (error) {
      console.error("Error in lesson status update cron job:", error);
    }
  });

  console.log("Cron jobs scheduled:");
  console.log("- Recurring lessons: Daily at 2 AM");
  console.log("- Lesson status updates: Every minute");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    prisma.$disconnect();
    console.log("Process terminated");
  });
});

export { app, prisma };
