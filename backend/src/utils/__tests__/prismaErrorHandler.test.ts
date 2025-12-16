import { handlePrismaError } from "../prismaErrorHandler";
import { Prisma } from "@prisma/client";

const makeKnownRequestError = (code: string, meta?: any) => {
  const err = new Error("PrismaClientKnownRequestError") as any;
  err.code = code;
  err.meta = meta;
  // Ensure instanceof check passes
  Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);
  return err as unknown as Error;
};

const makeRes = () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { json, status } as any;
};

describe("handlePrismaError", () => {
  it("returns true and sends message for P2002 phone+tutorId unique", () => {
    const meta = { target: ["phone", "tutorId"] };
    const err = makeKnownRequestError("P2002", meta);
    const res = makeRes();
    const handled = handlePrismaError(err, res);
    expect(handled).toBe(true);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status().json).toHaveBeenCalledWith({
      error: "У вас уже есть ученик с таким номером телефона",
    });
  });

  it("returns false for other errors", () => {
    const err = new Error("something else");
    const res = makeRes();
    const handled = handlePrismaError(err, res);
    expect(handled).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
  });
});
