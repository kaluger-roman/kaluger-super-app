import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "../types";
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map