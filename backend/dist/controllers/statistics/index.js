"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentStatistics = exports.getLessonsByType = exports.getLessonsBySubject = exports.getStatistics = void 0;
var getStatistics_1 = require("./getStatistics");
Object.defineProperty(exports, "getStatistics", { enumerable: true, get: function () { return getStatistics_1.getStatistics; } });
var getLessonStats_1 = require("./getLessonStats");
Object.defineProperty(exports, "getLessonsBySubject", { enumerable: true, get: function () { return getLessonStats_1.getLessonsBySubject; } });
Object.defineProperty(exports, "getLessonsByType", { enumerable: true, get: function () { return getLessonStats_1.getLessonsByType; } });
var getStudentStats_1 = require("./getStudentStats");
Object.defineProperty(exports, "getStudentStatistics", { enumerable: true, get: function () { return getStudentStats_1.getStudentStatistics; } });
//# sourceMappingURL=index.js.map