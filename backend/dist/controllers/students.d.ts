import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
export declare const getStudents: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getStudent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createStudent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateStudent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteStudent: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=students.d.ts.map