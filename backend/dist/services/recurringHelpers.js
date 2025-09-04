"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shiftFutureRecurringLessons = exports.groupRecurringLessonsByPattern = exports.getRecurringLessonKey = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
// Build a stable grouping key for recurring lessons
const getRecurringLessonKey = (lesson) => {
    const weekday = new Date(lesson.startTime).getDay();
    const hour = new Date(lesson.startTime).getHours();
    const minute = new Date(lesson.startTime).getMinutes();
    return `${lesson.tutorId}-${lesson.studentId}-${weekday}-${hour}-${minute}`;
};
exports.getRecurringLessonKey = getRecurringLessonKey;
// Group recurring lessons by a pattern: tutorId-studentId-weekday-hour-minute-duration
// Returns a Map where the value is the latest lesson for that pattern
const groupRecurringLessonsByPattern = (lessons) => {
    const lessonGroups = new Map();
    for (const lesson of lessons) {
        const key = (0, exports.getRecurringLessonKey)(lesson);
        // Keep the latest lesson for the group
        if (!lessonGroups.has(key) ||
            new Date(lesson.startTime) > new Date(lessonGroups.get(key).startTime)) {
            lessonGroups.set(key, lesson);
        }
    }
    return lessonGroups;
};
exports.groupRecurringLessonsByPattern = groupRecurringLessonsByPattern;
// Shift future recurring lessons in the same group when a base lesson time changes.
// If any planned shift conflicts with existing lessons, abort all shifts and return conflicts.
const shiftFutureRecurringLessons = async (existingLesson, newStart, newEnd) => {
    const oldStart = new Date(existingLesson.startTime);
    const oldEnd = new Date(existingLesson.endTime);
    const deltaStart = newStart.getTime() - oldStart.getTime();
    const deltaEnd = newEnd.getTime() - oldEnd.getTime();
    const key = (0, exports.getRecurringLessonKey)(existingLesson);
    const futureLessons = await prisma_1.default.lesson.findMany({
        where: {
            tutorId: existingLesson.tutorId,
            studentId: existingLesson.studentId,
            isRecurring: true,
            status: "SCHEDULED",
        },
    });
    const groups = (0, exports.groupRecurringLessonsByPattern)(futureLessons.concat(existingLesson));
    const base = groups.get(key);
    if (!base) {
        return { shifted: 0 };
    }
    const toShift = futureLessons.filter((l) => (0, exports.getRecurringLessonKey)(l) === key);
    const planned = toShift.map((l) => {
        const shiftedStart = new Date(new Date(l.startTime).getTime() + deltaStart);
        const shiftedEnd = new Date(new Date(l.endTime).getTime() + deltaEnd);
        return { original: l, shiftedStart, shiftedEnd };
    });
    // Pre-check conflicts for all planned shifts
    const conflictResults = await Promise.all(planned.map(async (p) => {
        const plannedIds = planned.map((pl) => pl.original.id);
        const conflict = await prisma_1.default.lesson.findFirst({
            where: {
                id: { notIn: plannedIds },
                tutorId: existingLesson.tutorId,
                status: { not: "CANCELLED" },
                AND: [
                    { startTime: { lt: p.shiftedEnd } },
                    { endTime: { gt: p.shiftedStart } },
                ],
            },
        });
        return { planned: p, conflict };
    }));
    const conflicts = conflictResults
        .filter((r) => !!r.conflict)
        .map((r) => ({
        lessonId: r.planned.original.id,
        conflictingLessonId: r.conflict.id,
    }));
    if (conflicts.length > 0) {
        // Abort all shifts if any conflict detected
        return { shifted: 0, conflicts };
    }
    // Apply all shifts in a transaction
    await prisma_1.default.$transaction(planned.map((p) => prisma_1.default.lesson.update({
        where: { id: p.original.id },
        data: { startTime: p.shiftedStart, endTime: p.shiftedEnd },
    })));
    return { shifted: planned.length };
};
exports.shiftFutureRecurringLessons = shiftFutureRecurringLessons;
//# sourceMappingURL=recurringHelpers.js.map