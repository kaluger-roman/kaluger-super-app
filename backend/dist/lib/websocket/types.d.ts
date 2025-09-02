import { WebSocket } from "ws";
export type AuthenticatedWebSocket = WebSocket & {
    userId?: string;
    email?: string;
};
//# sourceMappingURL=types.d.ts.map