import * as fs from "fs";
import * as path from "path";

const NEWS_DIR = path.resolve(__dirname, "../../prisma/news");

type NewsEntry = {
  title: string;
  content: string;
  version: string;
  publishedAt: string;
};

const parseArgs = (): NewsEntry | null => {
  const args = process.argv.slice(2);
  let title = "";
  let content = "";
  let version = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--title" && args[i + 1]) {
      title = args[++i];
    } else if (args[i] === "--content" && args[i + 1]) {
      content = args[++i];
    } else if (args[i] === "--version" && args[i + 1]) {
      version = args[++i];
    }
  }

  if (!title || !content || !version) {
    return null;
  }

  return { title, content, version, publishedAt: new Date().toISOString() };
};

const main = () => {
  const params = parseArgs();

  if (!params) {
    console.error(
      'Использование: npm run news:generate -- --title "Заголовок" --content "Текст" --version "2026-02-22"',
    );
    process.exit(1);
  }

  if (!fs.existsSync(NEWS_DIR)) {
    fs.mkdirSync(NEWS_DIR, { recursive: true });
  }

  const filePath = path.join(NEWS_DIR, `${params.version}.json`);

  if (fs.existsSync(filePath)) {
    console.log(`Новость для версии "${params.version}" уже существует: ${filePath}`);
    return;
  }

  fs.writeFileSync(filePath, JSON.stringify(params, null, 2) + "\n");
  console.log(`Новость сохранена: ${filePath}`);
};

main();
