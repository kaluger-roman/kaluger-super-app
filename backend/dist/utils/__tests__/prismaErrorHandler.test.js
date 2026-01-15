"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prismaErrorHandler_1 = require("../prismaErrorHandler");
const client_1 = require("@prisma/client");
const makeKnownRequestError = (code, meta) => {
    const err = new Error("PrismaClientKnownRequestError");
    err.code = code;
    err.meta = meta;
    // Ensure instanceof check passes
    Object.setPrototypeOf(err, client_1.Prisma.PrismaClientKnownRequestError.prototype);
    return err;
};
const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { json, status };
};
describe("handlePrismaError", () => {
    it("returns true and sends message for P2002 phone+tutorId unique", () => {
        const meta = { target: ["phone", "tutorId"] };
        const err = makeKnownRequestError("P2002", meta);
        const res = makeRes();
        const handled = (0, prismaErrorHandler_1.handlePrismaError)(err, res);
        expect(handled).toBe(true);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.status().json).toHaveBeenCalledWith({
            error: "У вас уже есть ученик с таким номером телефона",
        });
    });
    it("returns false for other errors", () => {
        const err = new Error("something else");
        const res = makeRes();
        const handled = (0, prismaErrorHandler_1.handlePrismaError)(err, res);
        expect(handled).toBe(false);
        expect(res.status).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=prismaErrorHandler.test.js.map