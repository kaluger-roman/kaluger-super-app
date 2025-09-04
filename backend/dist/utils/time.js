"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateToMinute = void 0;
const truncateToMinute = (date) => {
    const d = new Date(date);
    d.setSeconds(0, 0);
    return d;
};
exports.truncateToMinute = truncateToMinute;
//# sourceMappingURL=time.js.map