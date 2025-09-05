"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePrismaError = void 0;
const client_1 = require("@prisma/client");
const handlePrismaError = (error, res) => {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            const target = error.meta?.target;
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
exports.handlePrismaError = handlePrismaError;
//# sourceMappingURL=prismaErrorHandler.js.map