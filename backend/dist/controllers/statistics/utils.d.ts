export declare const getDateRange: (startDate?: string, endDate?: string) => {
    gte: Date;
    lte: Date;
};
export declare const getLastMonthRange: () => {
    gte: Date;
    lte: Date;
};
export declare const buildStatisticsWhere: (userId: string, startDate?: string, endDate?: string) => {
    tutorId: string;
    startTime: {
        gte: Date;
        lte: Date;
    };
};
//# sourceMappingURL=utils.d.ts.map