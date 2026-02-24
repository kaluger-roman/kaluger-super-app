import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
export declare const subscribe: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=subscribe.d.ts.map