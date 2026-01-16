import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
export declare const archiveStudent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const unarchiveStudent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=archiveStudent.d.ts.map