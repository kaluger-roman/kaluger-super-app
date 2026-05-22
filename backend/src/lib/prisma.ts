import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prisma по умолчанию сериализует Decimal как string (например "1500.50") —
// фронт ожидает number. Переопределяем toJSON, чтобы res.json() выдавал
// number и API-контракт оставался прежним. Десятичные хранятся точно в БД,
// а в JSON попадают через toNumber() с точностью 2 знаков (для денег).
//
// Это безопасно: единственное место, где Prisma.Decimal сериализуется в
// JSON — это res.json() / JSON.stringify(); ни один потребитель не ожидает
// строку.
const decimalProto = Prisma.Decimal.prototype as unknown as {
  toJSON: () => number;
};
decimalProto.toJSON = function (this: Prisma.Decimal): number {
  return this.toNumber();
};

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = prisma;
}

export default prisma;
