import { Router } from "express";
import { getNews, hasUnreadNews, markNewsRead } from "../controllers/news";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", getNews);
router.get("/has-unread", hasUnreadNews);
router.post("/mark-read", markNewsRead);

export default router;
