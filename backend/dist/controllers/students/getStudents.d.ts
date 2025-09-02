import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
export declare const getStudents: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getStudent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=getStudents.d.ts.map