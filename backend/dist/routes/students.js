"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const students_1 = require("../controllers/students");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticateToken);
router.get("/", students_1.getStudents);
router.get("/:id", students_1.getStudent);
router.post("/", students_1.createStudent);
router.put("/:id", students_1.updateStudent);
router.delete("/:id", students_1.deleteStudent);
exports.default = router;
//# sourceMappingURL=students.js.map