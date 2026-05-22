import { Router } from "express";
import { getNews, hasUnreadNews, markNewsRead } from "../controllers/news";
import { authenticateToken } from "../middleware/auth";

export const newsRouter = Router();

newsRouter.use(authenticateToken);

newsRouter.get("/", getNews);
newsRouter.get("/has-unread", hasUnreadNews);
newsRouter.post("/mark-read", markNewsRead);
