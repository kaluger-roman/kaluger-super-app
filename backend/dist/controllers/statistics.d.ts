import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
export declare const getStatistics: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getLessonsBySubject: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getLessonsByType: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getStudentStatistics: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=statistics.d.ts.map