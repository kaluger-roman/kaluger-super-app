import { Router, Request, Response } from "express";
import { findLatestMailFor, clearTestMailbox } from "../lib/testMailbox";
import prisma from "../lib/prisma";
import { generateAdminToken } from "../utils/auth";
import { generateStudentToken } from "../utils/studentAuth";
import {
  generateVerificationCode,
  getVerificationCodeExpiry,
} from "../utils/verification";
import { hashPassword, generateToken, normalizeEmail } from "../utils";

export const testRouter = Router();

testRouter.post("/reset", async (_req: Request, res: Response) => {
  await prisma.scheduledReminder.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.reminderSettings.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.studentInvitation.deleteMany();
  await prisma.studentUser.deleteMany();
  await prisma.student.deleteMany();
  await prisma.taxRatePeriod.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.newsReadStatus.deleteMany();
  await prisma.newsItem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.backupSettings.deleteMany();
  clearTestMailbox();
  res.status(204).end();
});

testRouter.get("/mailbox/:email", (req: Request, res: Response) => {
  const entry = findLatestMailFor(req.params.email);
  if (!entry) {
    return res.status(404).json({ error: "no mail" });
  }
  res.json(entry);
});

testRouter.delete("/mailbox", (_req: Request, res: Response) => {
  clearTestMailbox();
  res.status(204).end();
});

testRouter.post("/users", async (req: Request, res: Response) => {
  const { email: rawEmail, password, name, taxEnabled } = req.body;
  const email = normalizeEmail(rawEmail);
  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      isEmailVerified: true,
      taxEnabled: Boolean(taxEnabled),
    },
  });
  const token = generateToken({
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
  });
  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      taxEnabled: user.taxEnabled,
    },
    token,
  });
});

testRouter.post("/users/:userId/tax-periods", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const periods: Array<{ startDate: string; rate: number }> = req.body.periods;
  await prisma.taxRatePeriod.deleteMany({ where: { userId } });
  if (periods.length > 0) {
    await prisma.taxRatePeriod.createMany({
      data: periods.map((p) => ({
        userId,
        startDate: new Date(p.startDate),
        rate: p.rate,
      })),
    });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { taxEnabled: req.body.taxEnabled ?? true },
  });
  const stored = await prisma.taxRatePeriod.findMany({
    where: { userId },
    orderBy: { startDate: "asc" },
  });
  res.json({ periods: stored });
});

testRouter.post("/users/:userId/students", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const data = req.body;
  const student = await prisma.student.create({
    data: {
      tutorId: userId,
      name: data.name,
      contactMethod: data.contactMethod ?? "WHATSAPP",
      hourlyRate: data.hourlyRate ?? null,
      grade: data.grade ?? null,
      phone: data.phone ?? null,
      notes: data.notes ?? null,
      archived: Boolean(data.archived),
      archivedAt: data.archived ? new Date() : null,
      archiveReason: data.archived
        ? (data.archiveReason ?? "COMPLETED_STUDIES")
        : null,
    },
  });
  res.status(201).json({ student });
});

testRouter.post("/lessons", async (req: Request, res: Response) => {
  const data = req.body;
  const lesson = await prisma.lesson.create({
    data: {
      tutorId: data.tutorId,
      studentId: data.studentId,
      subject: data.subject ?? "MATHEMATICS",
      lessonType: data.lessonType ?? "SCHOOL",
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      price: data.price ?? null,
      status: data.status ?? "SCHEDULED",
      isPaid: Boolean(data.isPaid),
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
      isRecurring: Boolean(data.isRecurring),
    },
  });
  res.status(201).json({ lesson });
});

testRouter.patch("/lessons/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const data: Record<string, unknown> = {};
  if (req.body.startTime !== undefined) data.startTime = new Date(req.body.startTime);
  if (req.body.endTime !== undefined) data.endTime = new Date(req.body.endTime);
  if (req.body.status !== undefined) data.status = req.body.status;
  if (req.body.isPaid !== undefined) data.isPaid = req.body.isPaid;
  if (req.body.paymentDate !== undefined) {
    data.paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : null;
  }
  const lesson = await prisma.lesson.update({ where: { id }, data });
  res.json({ lesson });
});

testRouter.get("/lessons", async (req: Request, res: Response) => {
  const tutorId = req.query.tutorId as string | undefined;
  const lessons = await prisma.lesson.findMany({
    where: tutorId ? { tutorId } : undefined,
    orderBy: { startTime: "asc" },
  });
  res.json({ lessons });
});

testRouter.get("/users/:userId/students", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const archived = req.query.archived === "true";
  const students = await prisma.student.findMany({
    where: { tutorId: userId, archived },
  });
  res.json({ students });
});

testRouter.post("/news", async (req: Request, res: Response) => {
  const items = (req.body.items ?? []) as Array<{
    title: string;
    content: string;
    publishedAt?: string;
    version?: string;
  }>;
  await prisma.newsItem.createMany({
    data: items.map((item, idx) => ({
      title: item.title,
      content: item.content,
      version: item.version ?? null,
      publishedAt: item.publishedAt
        ? new Date(item.publishedAt)
        : new Date(Date.now() - idx * 60_000),
    })),
  });
  const stored = await prisma.newsItem.findMany({
    orderBy: { publishedAt: "desc" },
  });
  res.json({ items: stored });
});

testRouter.post(
  "/run-lesson-status-tick",
  async (_req: Request, res: Response) => {
    const { updateLessonStatuses } = await import(
      "../services/lessonStatusUpdater"
    );
    await updateLessonStatuses();
    res.status(204).end();
  },
);

testRouter.post(
  "/run-recurring-lessons-tick",
  async (_req: Request, res: Response) => {
    const { processRecurringLessons } = await import(
      "../services/recurringLessons"
    );
    await processRecurringLessons();
    res.status(204).end();
  },
);

testRouter.get(
  "/users/:userId/scheduled-reminders",
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const reminders = await prisma.scheduledReminder.findMany({
      where: { userId },
      orderBy: { scheduledAt: "asc" },
    });
    res.json({ reminders });
  },
);

testRouter.get(
  "/users/:userId/push-subscriptions",
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    res.json({ subscriptions });
  },
);

testRouter.post(
  "/students/:studentId/student-user",
  async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { name, email, password, isEmailVerified, withCode } = req.body;
    const hashed = await hashPassword(password);
    const code = withCode ? generateVerificationCode() : null;
    const studentUser = await prisma.studentUser.create({
      data: {
        email: normalizeEmail(email),
        password: hashed,
        name,
        studentId,
        isEmailVerified: Boolean(isEmailVerified),
        verificationCode: code,
        verificationCodeExpiry: code ? getVerificationCodeExpiry() : null,
        verificationCodeSentAt: code ? new Date() : null,
      },
    });
    const token = generateStudentToken({
      studentUserId: studentUser.id,
      email: studentUser.email,
      isStudent: true,
      tokenVersion: studentUser.tokenVersion,
    });
    res.status(201).json({
      studentUser: {
        id: studentUser.id,
        email: studentUser.email,
        name: studentUser.name,
        isEmailVerified: studentUser.isEmailVerified,
      },
      token,
      verificationCode: code,
    });
  },
);

testRouter.post("/admin/token", (_req: Request, res: Response) => {
  const email = process.env.ADMIN_EMAIL || "admin@e2e.local";
  const token = generateAdminToken({ email, isAdmin: true });
  res.status(201).json({ token });
});

testRouter.delete("/backup/files", async (_req: Request, res: Response) => {
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.resolve(
    process.cwd(),
    process.env.BACKUP_DIR || "backups",
  );
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".sql.gz")) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  }
  res.status(204).end();
});
