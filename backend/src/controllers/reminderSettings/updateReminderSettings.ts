import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import type { ReminderSettingsDto } from "../../types";
import { prisma } from "../../lib/prisma";
import { recalculateRemindersForUser, cancelAllPendingReminders } from "../../services";
import { validateSettingsData } from "./validators";

export const updateReminderSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const data: ReminderSettingsDto = req.body;

    const validation = validateSettingsData(data);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Lazy creation via upsert — race-safe across parallel first requests
    const existing = await prisma.reminderSettings.upsert({
      where: { userId: userId! },
      update: {},
      create: {
        userId: userId!,
        enabled: false,
        intervals: [],
        muteWhenInLesson: false,
      },
    });

    // Build update data
    const updateData: {
      enabled?: boolean;
      intervals?: number[];
      muteWhenInLesson?: boolean;
      callNotificationsEnabled?: boolean;
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

    if (data.callNotificationsEnabled !== undefined) {
      updateData.callNotificationsEnabled = data.callNotificationsEnabled;
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

    return res.json({
      enabled: settings.enabled,
      intervals: settings.intervals,
      muteWhenInLesson: settings.muteWhenInLesson,
      callNotificationsEnabled: settings.callNotificationsEnabled,
    });
  } catch (error) {
    console.error("Update reminder settings error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
