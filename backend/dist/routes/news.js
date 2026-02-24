"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const news_1 = require("../controllers/news");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get("/", news_1.getNews);
router.get("/has-unread", news_1.hasUnreadNews);
router.post("/mark-read", news_1.markNewsRead);
exports.default = router;
//# sourceMappingURL=news.js.map