import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
export declare const getLessons: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getLesson: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createLesson: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateLesson: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteLesson: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUpcomingLessons: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=lessons.d.ts.map