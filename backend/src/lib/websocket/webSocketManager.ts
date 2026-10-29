import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "http";
import type { Socket } from "net";
import type {
  AuthenticatedStudentWebSocket,
  AuthenticatedWebSocket,
  WaitingReleaseReason,
} from "./types";
import { authenticateWebSocket } from "./auth";
import { authenticateStudentWebSocket } from "./studentAuth";
import { handleMessage, sendWelcomeMessage } from "./messageHandler";
import { participantDisconnected, participantRevoked } from "../../services/callSignaling";
import { routeCallMessage } from "./signaling";
import { getCachedTokenVersion } from "../tokenVersionCache";
import { WS_MAX_PAYLOAD_BYTES } from "./signaling.constants";
import {
  CALL_ENDED_CLOSE_CODE,
  HEARTBEAT_INTERVAL_MS,
  HOLDER_GONE_CLOSE_CODE,
  HOLDER_PROBE_TIMEOUT_MS,
  REPLACED_CLOSE_CODE,
  REVOKED_SOCKET_TERMINATE_MS,
  STUDENT_WS_PATH,
  TOKEN_REVOKED_CLOSE_CODE,
  TUTOR_WS_PATH,
} from "./connection.constants";
import { readTabId, sendConnectionReady, toTakeoverDecision } from "./connection.helpers";
import { createWaitingSockets } from "./waitingSockets";
import type { CallerKindValue, StudentLessonWsEvent } from "../../types";

// `noServer: true` + единый upgrade-handler обязателен: два WebSocketServer
// на одном HTTP, привязанные через `path`, конфликтуют — первый при path
// mismatch вызывает `socket.destroy()` и убивает рукопожатие второго.
export class WebSocketManager {
  private wss: WebSocketServer;
  private studentWss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private studentClients: Map<string, AuthenticatedStudentWebSocket> = new Map();
  private waiting = createWaitingSockets();
  private awaitingPong = new WeakSet<WebSocket>();
  // Kept apart from the heartbeat's set: a holder probed just before a heartbeat tick must get the
  // full probe time to answer.
  private awaitingProbe = new WeakSet<WebSocket>();
  private heartbeat: ReturnType<typeof setInterval>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ noServer: true, maxPayload: WS_MAX_PAYLOAD_BYTES });
    this.wss.on("connection", this.handleConnection.bind(this));

    this.studentWss = new WebSocketServer({ noServer: true, maxPayload: WS_MAX_PAYLOAD_BYTES });
    this.studentWss.on("connection", this.handleStudentConnection.bind(this));

    server.on("upgrade", this.handleUpgrade.bind(this));

    this.heartbeat = setInterval(() => this.checkHeartbeats(), HEARTBEAT_INTERVAL_MS);
    this.heartbeat.unref();
    server.on("close", () => clearInterval(this.heartbeat));
  }

  private checkHeartbeats() {
    [...this.clients.values(), ...this.studentClients.values(), ...this.waiting.all()].forEach(
      (ws) => {
        if (this.awaitingPong.has(ws)) {
          // Terminating emits close, which unregisters the socket; its call waits for a return.
          ws.terminate();
          return;
        }
        this.awaitingPong.add(ws);
        try {
          ws.ping();
        } catch (error) {
          console.error("Failed to ping WebSocket:", error);
        }
      }
    );
  }

  private watchHeartbeat(ws: WebSocket) {
    ws.on("pong", () => {
      this.awaitingPong.delete(ws);
      this.awaitingProbe.delete(ws);
    });
  }

  // A sleeping phone may leave its socket looking open for a minute; the tab that asks now
  // should not wait that long for the call it could take over.
  private probeHolder(holder: WebSocket) {
    if (this.awaitingProbe.has(holder)) return;
    this.awaitingProbe.add(holder);
    try {
      holder.ping();
    } catch (error) {
      console.error("Failed to ping WebSocket:", error);
    }
    setTimeout(() => {
      if (!this.awaitingProbe.has(holder)) return;
      this.awaitingProbe.delete(holder);
      if (holder.readyState !== WebSocket.CLOSED) holder.terminate();
    }, HOLDER_PROBE_TIMEOUT_MS).unref();
  }

  private wait(kind: CallerKindValue, id: string, ws: WebSocket, holder: WebSocket | undefined) {
    // Closed while auth was running: nothing to keep.
    if (ws.readyState !== WebSocket.OPEN) return;
    this.watchHeartbeat(ws);
    this.waiting.add(kind, id, ws);
    if (holder) this.probeHolder(holder);
  }

  private handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
    const rawUrl = request.url ?? "/";
    const pathname = rawUrl.split("?", 1)[0];

    if (pathname === TUTOR_WS_PATH) {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit("connection", ws, request);
      });
      return;
    }
    if (pathname === STUDENT_WS_PATH) {
      this.studentWss.handleUpgrade(request, socket, head, (ws) => {
        this.studentWss.emit("connection", ws, request);
      });
      return;
    }
    socket.destroy();
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    const decoded = await authenticateWebSocket(ws, request);
    if (!decoded) return;

    // The token may have been revoked while its version was read from the DB; nothing below
    // awaits, so this check holds until the socket is registered.
    const currentVersion = getCachedTokenVersion(decoded.userId);
    if (currentVersion !== undefined && currentVersion !== decoded.tokenVersion) {
      ws.close(TOKEN_REVOKED_CLOSE_CODE, "Token revoked");
      return;
    }

    // Attach user info to WebSocket
    ws.userId = decoded.userId;
    ws.email = decoded.email;
    ws.tabId = readTabId(request);

    const previous = this.clients.get(decoded.userId);
    const decision = toTakeoverDecision("tutor", decoded.userId, previous, ws, request);
    if (decision.action === "refuse") {
      ws.close(decision.code, decision.reason);
      return;
    }
    if (decision.action === "wait") {
      this.wait("tutor", decoded.userId, ws, previous);
      return;
    }

    // If a previous connection exists for this user, close it before replacing.
    // The old socket's close-handler will fire later but won't affect the new one
    // because of the identity check below. The call stays: the new socket carries it on.
    if (previous && previous !== ws) {
      try {
        previous.close(REPLACED_CLOSE_CODE, "Replaced by newer connection");
      } catch (error) {
        console.error("Error closing previous WebSocket:", error);
      }
    }

    // Регистрируем close/error handlers ДО `set`, иначе синхронный close
    // между set и регистрацией оставит запись-сироту в clients.
    const release = () => {
      if (this.clients.get(decoded.userId) !== ws) return;
      this.clients.delete(decoded.userId);
      void participantDisconnected({ kind: "tutor", id: decoded.userId }, ws.tabId);
    };

    ws.on("close", () => {
      console.log(`WebSocket disconnected: ${decoded.email} (${decoded.userId})`);
      release();
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${decoded.userId}:`, error);
      release();
    });

    ws.on("message", (message) => {
      // A replaced or revoked socket stays readable until it closes; it no longer speaks for the user.
      if (this.clients.get(decoded.userId) !== ws) return;
      try {
        const data = JSON.parse(message.toString());
        handleMessage(ws, decoded.userId, data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    // Если socket закрылся, пока шёл async auth, не сохраняем мёртвую запись.
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.clients.set(decoded.userId, ws);
    this.watchHeartbeat(ws);
    sendConnectionReady(ws);

    console.log(`WebSocket connected: ${decoded.email} (${decoded.userId})`);

    try {
      sendWelcomeMessage(ws, decoded.userId);
    } catch (error) {
      console.error("Failed to send welcome message:", error);
    }
  }

  private async handleStudentConnection(
    ws: AuthenticatedStudentWebSocket,
    request: IncomingMessage
  ) {
    const decoded = await authenticateStudentWebSocket(ws, request);
    if (!decoded) return;

    ws.studentUserId = decoded.studentUserId;
    ws.email = decoded.email;
    ws.tabId = readTabId(request);

    const previous = this.studentClients.get(decoded.studentUserId);
    const decision = toTakeoverDecision("student", decoded.studentUserId, previous, ws, request);
    if (decision.action === "refuse") {
      ws.close(decision.code, decision.reason);
      return;
    }
    if (decision.action === "wait") {
      this.wait("student", decoded.studentUserId, ws, previous);
      return;
    }

    if (previous && previous !== ws) {
      try {
        previous.close(REPLACED_CLOSE_CODE, "Replaced by newer connection");
      } catch (error) {
        console.error("Error closing previous student WebSocket:", error);
      }
    }

    // Регистрируем close/error handlers ДО `set`, иначе синхронный close
    // между set и регистрацией оставит запись-сироту в studentClients.
    const release = () => {
      if (this.studentClients.get(decoded.studentUserId) !== ws) return;
      this.studentClients.delete(decoded.studentUserId);
      void participantDisconnected({ kind: "student", id: decoded.studentUserId }, ws.tabId);
    };

    ws.on("close", () => {
      console.log(`Student WebSocket disconnected: ${decoded.email} (${decoded.studentUserId})`);
      release();
    });

    ws.on("error", (error) => {
      console.error(`Student WebSocket error for ${decoded.studentUserId}:`, error);
      release();
    });

    ws.on("message", (message) => {
      if (this.studentClients.get(decoded.studentUserId) !== ws) return;
      try {
        const data = JSON.parse(message.toString());
        routeCallMessage("student", decoded.studentUserId, data);
      } catch (error) {
        console.error("Error parsing student WebSocket message:", error);
      }
    });

    // Если socket закрылся, пока шёл async auth, не сохраняем мёртвую запись.
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.studentClients.set(decoded.studentUserId, ws);
    this.watchHeartbeat(ws);
    sendConnectionReady(ws);

    console.log(`Student WebSocket connected: ${decoded.email} (${decoded.studentUserId})`);
  }

  // Method to broadcast lesson status changes to all connected clients
  public broadcastLessonStatusUpdate(
    lessonId: string,
    status: string,
    tutorId?: string,
    studentUserId?: string | null
  ) {
    const message = JSON.stringify({
      type: "lesson_status_updated",
      lessonId,
      status,
    });

    // Если указан tutorId, отправляем только ему, иначе всем
    if (tutorId) {
      this.sendToUser(tutorId, {
        type: "lesson_status_updated",
        lessonId,
        status,
      });
    } else {
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }

    if (studentUserId) {
      this.sendToStudent(studentUserId, {
        type: "lesson_status_updated",
        lessonId,
        status,
      });
    }

    console.log(
      `Broadcasted lesson status update (${status}) for lesson ${lessonId} to ${
        tutorId ? "1 tutor" : this.clients.size + " tutors"
      }${studentUserId ? " + 1 student" : ""}`
    );
  }

  // Send a typed lesson event to a specific student (used for create/update/delete)
  public broadcastStudentLessonEvent(studentUserId: string, event: StudentLessonWsEvent): boolean {
    return this.sendToStudent(studentUserId, event);
  }

  // Method to send message to specific user
  public sendToUser(userId: string, message: unknown) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  public sendToStudent(studentUserId: string, message: unknown): boolean {
    const client = this.studentClients.get(studentUserId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // The socket was opened with a token that is now revoked; calls must not go on over it.
  public disconnectUser(userId: string): void {
    // Before the call ends below, so they hear "revoked" and not "call ended, come back".
    this.waiting.release("tutor", userId, TOKEN_REVOKED_CLOSE_CODE, "Token revoked");
    const ws = this.clients.get(userId);
    // Revoke at once: the close handshake may take long, and until then the socket must not
    // stay registered. Its close handler then finds nothing to report.
    this.clients.delete(userId);
    // Also when no socket is left: the call may still wait for the lost connection to come back.
    void participantRevoked({ kind: "tutor", id: userId });
    if (!ws) return;
    try {
      ws.close(TOKEN_REVOKED_CLOSE_CODE, "Token revoked");
    } catch (error) {
      console.error("Error closing revoked WebSocket:", error);
    }
    setTimeout(() => {
      if (ws.readyState !== WebSocket.CLOSED) ws.terminate();
    }, REVOKED_SOCKET_TERMINATE_MS).unref();
  }

  // Tabs that waited for the user's call may ask for the connection again: the call ended, or the
  // tab that held it is gone while the call waits for the user to come back.
  public releaseWaitingSockets(
    kind: CallerKindValue,
    id: string,
    reason: WaitingReleaseReason = "call_ended"
  ): void {
    if (reason === "holder_gone") {
      this.waiting.release(kind, id, HOLDER_GONE_CLOSE_CODE, "Call holder is gone");
      return;
    }
    this.waiting.release(kind, id, CALL_ENDED_CLOSE_CODE, "Call ended in another tab");
  }

  public getConnection(kind: CallerKindValue, id: string): WebSocket | undefined {
    return kind === "tutor" ? this.clients.get(id) : this.studentClients.get(id);
  }

  public sendToParticipant(kind: CallerKindValue, id: string, message: unknown): boolean {
    return kind === "tutor" ? this.sendToUser(id, message) : this.sendToStudent(id, message);
  }

  // Method to get connected users count
  public getConnectedUsersCount(): number {
    return this.clients.size;
  }

  // Method to get connected users
  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public getConnectedStudentsCount(): number {
    return this.studentClients.size;
  }

  public getConnectedStudents(): string[] {
    return Array.from(this.studentClients.keys());
  }
}
