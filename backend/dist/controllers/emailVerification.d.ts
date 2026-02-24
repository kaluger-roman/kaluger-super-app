import { Request, Response } from "express";
import { VerifyEmailDto, ResendVerificationDto } from "../types";
export declare const verifyEmail: (req: Request<{}, {}, VerifyEmailDto>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const resendVerification: (req: Request<{}, {}, ResendVerificationDto>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=emailVerification.d.ts.map