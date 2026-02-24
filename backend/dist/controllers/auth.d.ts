import { Request, Response } from "express";
import { CreateUserDto, LoginDto } from "../types";
import { AuthRequest } from "../middleware/auth";
export declare const register: (req: Request<{}, {}, CreateUserDto>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const login: (req: Request<{}, {}, LoginDto>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.d.ts.map