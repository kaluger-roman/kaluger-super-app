import { JwtPayload } from "../types";
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const generateToken: (payload: JwtPayload) => string;
export declare const verifyToken: (token: string) => JwtPayload | null;
export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => boolean;
//# sourceMappingURL=auth.d.ts.map