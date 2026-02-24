"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatReminderBody = exports.formatReminderTitle = exports.sendPushToUser = void 0;
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = __importDefault(require("../lib/prisma"));
let vapidConfigured = false;
const ensureVapidConfigured = () => {
    if (vapidConfigured)
        return;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
        throw new Error("VAPID ключи не настроены");
    }
    web_push_1.default.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
};
const sendPushToUser = async (userId, payload) => {
    ensureVapidConfigured();
    const subscriptions = await prisma_1.default.pushSubscription.findMany({
        where: { userId },
    });
    if (subscriptions.length === 0) {
        return { sent: 0, failed: 0 };
    }
    let sent = 0;
    let failed = 0;
    for (const sub of subscriptions) {
        try {
            await web_push_1.default.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            }, JSON.stringify(payload));
            sent++;
        }
        catch (error) {
            const statusCode = error.statusCode;
            // Remove stale subscriptions (gone or not found)
            if (statusCode === 410 || statusCode === 404) {
                await prisma_1.default.pushSubscription.delete({
                    where: { id: sub.id },
                }).catch(() => {
                    // Ignore if already deleted
                });
            }
            failed++;
            console.error(`Push delivery failed for subscription ${sub.id}:`, error);
        }
    }
    return { sent, failed };
};
exports.sendPushToUser = sendPushToUser;
const formatReminderTitle = (intervalMinutes) => {
    if (intervalMinutes === 60) {
        return "Урок через 1 час";
    }
    return `Урок через ${intervalMinutes} минут`;
};
exports.formatReminderTitle = formatReminderTitle;
const formatReminderBody = (subject, lessonType, studentName, startTime, endTime) => {
    const subjectMap = {
        MATHEMATICS: "Математика",
        PHYSICS: "Физика",
    };
    const lessonTypeMap = {
        EGE: "ЕГЭ",
        OGE: "ОГЭ",
        OLYMPICS: "Олимпиады",
        SCHOOL: "Школа",
    };
    const subjectName = subjectMap[subject] || subject;
    const typeName = lessonTypeMap[lessonType] || lessonType;
    const formatTime = (date) => {
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
    };
    return `${subjectName} (${typeName}) — ${studentName}, ${formatTime(startTime)}–${formatTime(endTime)}`;
};
exports.formatReminderBody = formatReminderBody;
//# sourceMappingURL=pushNotification.js.map