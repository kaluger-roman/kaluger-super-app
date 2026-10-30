import { prisma } from "../lib/prisma";
import { seedDevData } from "../services/devSeed";

const main = async () => {
  try {
    const result = await seedDevData();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Ошибка наполнения базы:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

main();
