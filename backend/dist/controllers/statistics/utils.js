"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatisticsWhere = exports.getLastMonthRange = exports.getDateRange = void 0;
const getDateRange = (startDate, endDate) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const lte = endDate
        ? (() => {
            const d = new Date(endDate);
            d.setHours(23, 59, 59, 999);
            return d;
        })()
        : currentMonthEnd;
    return {
        gte: startDate ? new Date(startDate) : currentMonthStart,
        lte,
    };
};
exports.getDateRange = getDateRange;
const getLastMonthRange = () => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
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