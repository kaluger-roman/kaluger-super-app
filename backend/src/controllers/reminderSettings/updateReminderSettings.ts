import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import type { ReminderSettingsDto } from "../../types";
import prisma from "../../lib/prisma";
import { recalculateRemindersForUser, cancelAllPendingReminders } from "../../services";

const VALID_INTERVALS = [5, 10, 15, 30, 60];

const validateSettingsData = (data: ReminderSettingsDto) => {
  if (data.intervals !== undefined) {
    if (!Array.isArray(data.intervals)) {
      return { isValid: false, error: "Интервалы должны быть массивом" };
    }

    for (const interval of data.intervals) {
      if (!VALID_INTERVALS.includes(interval)) {
        return {
          isValid: false,
          error: "Недопустимый интервал напоминания. Допустимые значения: 5, 10, 15, 30, 60 минут",
        };
      }
    }

    const uniqueIntervals = new Set(data.intervals);
    if (uniqueIntervals.size !== data.intervals.length) {
      return { isValid: false, error: "Такой интервал уже добавлен" };
    }
  }

  return { isValid: true };
};

export const updateReminderSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const data: ReminderSettingsDto = req.body;

    const validation = validateSettingsData(data);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Get or create existing settings
    let existing = await prisma.reminderSettings.findUnique({
      where: { userId: userId! },
    });

    if (!existing) {
      existing = await prisma.reminderSettings.create({
        data: {
          userId: userId!,
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
        },
      });
    }

    // Build update data
    const updateData: {
      enabled?: boolean;
      intervals?: number[];
      muteWhenInLesson?: boolean;
    } = {};

    if (data.enabled !== undefined) {
      updateData.enabled = data.enabled;
    }

    if (data.intervals !== undefined) {
      updateData.intervals = data.intervals;
    }

    if (data.muteWhenInLesson !== undefined) {
      updateData.muteWhenInLesson = data.muteWhenInLesson;
    }

    // Auto-set intervals to [30] if enabling with empty intervals
    const willBeEnabled = updateData.enabled ?? existing.enabled;
    const willHaveIntervals = updateData.intervals ?? existing.intervals;

    if (willBeEnabled && willHaveIntervals.length === 0) {
      updateData.intervals = [30];
    }

    const settings = await prisma.reminderSettings.update({
      where: { userId: userId! },
      data: updateData,
    });

    // Recalculate reminders when enabled or intervals change
    const enabledChanged = data.enabled !== undefined && data.enabled !== existing.enabled;
    const intervalsChanged =
      data.intervals !== undefined &&
      JSON.stringify([...data.intervals].sort()) !== JSON.stringify([...existing.intervals].sort());

    if (enabledChanged && !settings.enabled) {
      // Disabled — cancel all pending reminders
      await cancelAllPendingReminders(userId!);
    } else if (enabledChanged || intervalsChanged) {
      // Enabled or intervals changed — recalculate
      if (settings.enabled) {
        await recalculateRemindersForUser(userId!);
      }
    }

    res.json({
      enabled: settings.enabled,
      intervals: settings.intervals,
      muteWhenInLesson: settings.muteWhenInLesson,
    });
  } catch (error) {
    console.error("Update reminder settings error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
