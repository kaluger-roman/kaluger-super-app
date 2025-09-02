import { AuthenticatedWebSocket } from "./types";
export declare const authenticateWebSocket: (ws: AuthenticatedWebSocket, request: any) => Promise<{
    userId: string;
    email: string;
} | null>;
//# sourceMappingURL=auth.d.ts.map