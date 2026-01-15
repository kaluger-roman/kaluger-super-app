"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatisticsWhere = exports.getLastMonthRange = exports.getDateRange = void 0;
const time_1 = require("../../utils/time");
// Parse date-only strings as local day ranges (00:00 local to 23:59:59.999 local).
const parseLocalDateStart = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const parseLocalDateEnd = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
};
const getDateRange = (startDate, endDate) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const gte = startDate ? parseLocalDateStart(startDate) : currentMonthStart;
    const lte = endDate ? parseLocalDateEnd(endDate) : currentMonthEnd;
    return { gte, lte };
};
exports.getDateRange = getDateRange;
const getLastMonthRange = () => {
    const now = (0, time_1.truncateToMinute)(new Date());
    const lastMonthStart = (0, time_1.truncateToMinute)(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = (0, time_1.truncateToMinute)(new Date(now.getFullYear(), now.getMonth(), 0));
    return {
        gte: lastMonthStart,
        lte: lastMonthEnd,
    };
};
exports.getLastMonthRange = getLastMonthRange;
const buildStatisticsWhere = (userId, startDate, endDate) => {
    return {
        tutorId: userId,
        startTime: (0, exports.getDateRange)(startDate, endDate),
    };
};
exports.buildStatisticsWhere = buildStatisticsWhere;
//# sourceMappingURL=utils.js.map