import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
export declare const hasUnreadNews: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=hasUnreadNews.d.ts.map