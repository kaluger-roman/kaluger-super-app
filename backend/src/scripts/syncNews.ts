import * as fs from "fs";
import * as path from "path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const NEWS_DIR = path.resolve(__dirname, "../../prisma/news");

type NewsEntry = {
  title: string;
  content: string;
  version: string;
  publishedAt: string;
};

const main = async () => {
  try {
    if (!fs.existsSync(NEWS_DIR)) {
      console.log("Директория новостей не найдена, пропускаем синхронизацию");
      return;
    }

    const files = fs
      .readdirSync(NEWS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();

    if (files.length === 0) {
      console.log("Нет новостей для синхронизации");
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const file of files) {
      const filePath = path.join(NEWS_DIR, file);
      const entry: NewsEntry = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      const existing = await prisma.newsItem.findFirst({
        where: { version: entry.version },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.newsItem.create({
        data: {
          title: entry.title,
          content: entry.content,
          version: entry.version,
          publishedAt: new Date(entry.publishedAt),
        },
      });

      created++;
      console.log(`Создана новость: "${entry.title}" (версия: ${entry.version})`);
    }

    console.log(`Синхронизация завершена: создано ${created}, пропущено ${skipped}`);
  } catch (error) {
    console.error("Ошибка синхронизации новостей:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

main();
