import { Prisma } from "@prisma/client";
import { Response } from "express";

export const handlePrismaError = (error: unknown, res: Response): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target as string[];
      if (target?.includes("email") && target?.includes("tutorId")) {
        res.status(400).json({ error: "У вас уже есть ученик с таким email" });
        return true;
      }
      if (target?.includes("phone") && target?.includes("tutorId")) {
        res
          .status(400)
          .json({ error: "У вас уже есть ученик с таким номером телефона" });
        return true;
      }
    }
  }
  return false;
};
