import { faker } from "@faker-js/faker";
import prisma from "../../lib/prisma";
import { hashPassword, comparePassword } from "../../utils/auth";
import { changePassword } from "../changePassword";

describe("changePassword service", () => {
  let userId: string;
  const originalPassword = "OldPassword1";

  beforeAll(async () => {
    const hashedPassword = await hashPassword(originalPassword);
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: hashedPassword,
        name: faker.person.fullName(),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("should throw 404 when user not found", async () => {
    await expect(
      changePassword("non-existent-id", "old", "New1Password"),
    ).rejects.toMatchObject({
      message: "Пользователь не найден",
      statusCode: 404,
    });
  });

  it("should throw 401 when current password is wrong", async () => {
    await expect(
      changePassword(userId, "WrongPassword1", "NewPassword1"),
    ).rejects.toMatchObject({
      message: "Неверный текущий пароль",
      statusCode: 401,
    });
  });

  it("should throw 400 when new password fails validation", async () => {
    await expect(
      changePassword(userId, originalPassword, "short"),
    ).rejects.toMatchObject({
      message: "Пароль должен содержать минимум 8 символов, заглавные и строчные буквы и цифру",
      statusCode: 400,
    });
  });

  it("should throw 400 when new password equals current", async () => {
    await expect(
      changePassword(userId, originalPassword, originalPassword),
    ).rejects.toMatchObject({
      message: "Новый пароль должен отличаться от текущего",
      statusCode: 400,
    });
  });

  it("should update password successfully", async () => {
    const newPassword = "NewPassword1";
    await changePassword(userId, originalPassword, newPassword);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isNewPasswordValid = await comparePassword(newPassword, user!.password);
    expect(isNewPasswordValid).toBe(true);

    const isOldPasswordValid = await comparePassword(originalPassword, user!.password);
    expect(isOldPasswordValid).toBe(false);
  });
});
