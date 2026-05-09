import { hashPassword } from "../utils/auth";

const main = async () => {
  const password = process.argv[2];

  if (!password) {
    console.error("Использование: npm run admin:hash-password -- <пароль>");
    process.exit(1);
  }

  const hash = await hashPassword(password);

  console.log("\nХеш пароля администратора:");
  console.log(hash);
  console.log(
    "\nДобавьте в .env (или секреты CI/CD):\nADMIN_PASSWORD_HASH=" + hash + "\n"
  );
};

main().catch((error) => {
  console.error("Ошибка генерации хеша:", error);
  process.exit(1);
});
