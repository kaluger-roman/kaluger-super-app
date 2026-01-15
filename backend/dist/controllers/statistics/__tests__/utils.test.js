"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const time_1 = require("../../../utils/time");
describe("statistics utils", () => {
    beforeAll(() => {
        const fixed = new Date("2025-12-15T12:34:56.789Z");
        // Use Jest modern fake timers to set system time
        // @ts-ignore
        jest.useFakeTimers("modern");
        // @ts-ignore
        jest.setSystemTime(fixed);
    });
    afterAll(() => {
        // @ts-ignore
        jest.useRealTimers();
    });
    it("getDateRange returns current month when no dates provided", () => {
        const { gte, lte } = (0, utils_1.getDateRange)();
        // For frozen date 2025-12-15, current month start is 2025-12-01 00:00:00
        expect(gte.getFullYear()).toBe(2025);
        expect(gte.getMonth()).toBe(11); // months are 0-based
        expect(gte.getDate()).toBe(1);
        expect(gte.getHours()).toBe(0);
        // lte should be end of month 2025-12-31 23:59:59.999
        expect(lte.getFullYear()).toBe(2025);
        expect(lte.getMonth()).toBe(11);
        expect(lte.getDate()).toBe(31);
        expect(lte.getHours()).toBe(23);
        expect(lte.getMinutes()).toBe(59);
        expect(lte.getSeconds()).toBe(59);
        expect(lte.getMilliseconds()).toBe(999);
    });
    it("getDateRange sets gte when startDate provided and lte to current month end when endDate missing", () => {
        const { gte, lte } = (0, utils_1.getDateRange)("2025-11-05");
        expect(gte.getFullYear()).toBe(2025);
        expect(gte.getMonth()).toBe(10);
        expect(gte.getDate()).toBe(5);
        // lte remains current month end (December)
        expect(lte.getMonth()).toBe(11);
        expect(lte.getDate()).toBe(31);
    });
    it("getDateRange sets lte to end of provided endDate when endDate provided", () => {
        const { gte, lte } = (0, utils_1.getDateRange)(undefined, "2025-10-03");
        // gte default is start of current month (Dec 1)
        expect(gte.getMonth()).toBe(11);
        expect(gte.getDate()).toBe(1);
        // lte should reflect provided endDate at 23:59:59.999 of that day
        expect(lte.getFullYear()).toBe(2025);
        expect(lte.getMonth()).toBe(9); // October
        expect(lte.getDate()).toBe(3);
        expect(lte.getHours()).toBe(23);
        expect(lte.getMinutes()).toBe(59);
        expect(lte.getSeconds()).toBe(59);
        expect(lte.getMilliseconds()).toBe(999);
    });
    it("getDateRange with both startDate and endDate returns exact boundaries", () => {
        const { gte, lte } = (0, utils_1.getDateRange)("2025-01-02", "2025-01-05");
        expect(gte.getFullYear()).toBe(2025);
        expect(gte.getMonth()).toBe(0);
        expect(gte.getDate()).toBe(2);
        expect(lte.getFullYear()).toBe(2025);
        expect(lte.getMonth()).toBe(0);
        expect(lte.getDate()).toBe(5);
        expect(lte.getHours()).toBe(23);
    });
    it("getLastMonthRange returns truncated minutes for start and end", () => {
        const { gte, lte } = (0, utils_1.getLastMonthRange)();
        // For frozen date 2025-12-15T12:34:56.789Z, last month is November 2025
        expect(gte.getFullYear()).toBe(2025);
        expect(gte.getMonth()).toBe(10); // November
        expect(gte.getDate()).toBe(1);
        // truncated seconds and ms
        expect(gte.getSeconds()).toBe(0);
        expect(gte.getMilliseconds()).toBe(0);
        expect(lte.getFullYear()).toBe(2025);
        expect(lte.getMonth()).toBe(10);
        // last day of November is 30
        expect(lte.getDate()).toBe(30);
        expect(lte.getSeconds()).toBe(0);
        expect(lte.getMilliseconds()).toBe(0);
        // Also ensure returned values equal calling truncateToMinute manually
        const manualGte = (0, time_1.truncateToMinute)(new Date(2025, 10, 1));
        const manualLte = (0, time_1.truncateToMinute)(new Date(2025, 11, 0));
        expect(gte.getTime()).toBe(manualGte.getTime());
        expect(lte.getTime()).toBe(manualLte.getTime());
    });
    it("buildStatisticsWhere builds where object with tutorId and startTime range", () => {
        const where = (0, utils_1.buildStatisticsWhere)("user-123", "2025-02-01", "2025-02-10");
        expect(where).toHaveProperty("tutorId", "user-123");
        expect(where).toHaveProperty("startTime");
        expect(where.startTime).toHaveProperty("gte");
        expect(where.startTime).toHaveProperty("lte");
        expect(where.startTime.gte.getFullYear()).toBe(2025);
        expect(where.startTime.gte.getMonth()).toBe(1);
        expect(where.startTime.gte.getDate()).toBe(1);
        expect(where.startTime.lte.getFullYear()).toBe(2025);
        expect(where.startTime.lte.getMonth()).toBe(1);
        expect(where.startTime.lte.getDate()).toBe(10);
        expect(where.startTime.lte.getHours()).toBe(23);
    });
});
//# sourceMappingURL=utils.test.js.map