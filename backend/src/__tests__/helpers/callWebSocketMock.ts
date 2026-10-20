import type { CallerKindValue, CallSignalingOutbound } from "../../types";

export type CapturedCallMessage = {
  kind: CallerKindValue;
  id: string;
  message: CallSignalingOutbound;
};

const online: Record<CallerKindValue, Set<string>> = { tutor: new Set(), student: new Set() };
const connections = new Map<string, object>();
const sent: CapturedCallMessage[] = [];

const connectionKey = (kind: CallerKindValue, id: string): string => `${kind}:${id}`;

// Stands in for the WebSocket manager in call tests: tracks who is online and records every
// message the call flow sends, delivered or not.
export const callWebSocket = {
  sent,
  connect: (kind: CallerKindValue, id: string): void => {
    online[kind].add(id);
  },
  disconnect: (kind: CallerKindValue, id: string): void => {
    online[kind].delete(id);
  },
  replaceConnection: (kind: CallerKindValue, id: string): void => {
    connections.set(connectionKey(kind, id), {});
  },
  messagesOfType: (type: CallSignalingOutbound["type"]): CapturedCallMessage[] =>
    sent.filter((captured) => captured.message.type === type),
  clearSent: (): void => {
    sent.length = 0;
  },
  reset: (): void => {
    online.tutor.clear();
    online.student.clear();
    connections.clear();
    sent.length = 0;
  },
};

export const callWebSocketManagerModule = {
  getWebSocketManager: () => ({
    getConnection: (kind: CallerKindValue, id: string): object | undefined => {
      if (!online[kind].has(id)) return undefined;
      const key = connectionKey(kind, id);
      if (!connections.has(key)) connections.set(key, {});
      return connections.get(key);
    },
    sendToParticipant: (kind: CallerKindValue, id: string, message: CallSignalingOutbound) => {
      sent.push({ kind, id, message });
      return online[kind].has(id);
    },
  }),
};
