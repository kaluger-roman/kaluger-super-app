"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mocks for dependencies: ws, auth, and messageHandler
jest.mock("ws", () => {
    class MockWSServer {
        handlers = {};
        options;
        constructor(options) {
            this.options = options;
            // register instance for tests
            MockWSServer.instances.push(this);
        }
        on(event, fn) {
            this.handlers[event] = fn;
        }
        simulateConnection(ws, request) {
            if (this.handlers["connection"]) {
                this.handlers["connection"](ws, request);
            }
        }
        static instances = [];
    }
    return {
        WebSocketServer: MockWSServer,
        WebSocket: { OPEN: 1 },
    };
});
jest.mock("../auth", () => ({
    authenticateWebSocket: jest.fn(),
}));
jest.mock("../messageHandler", () => ({
    handleMessage: jest.fn(),
    sendWelcomeMessage: jest.fn(),
}));
const ws_1 = require("ws"); // mocked
const auth_1 = require("../auth");
const messageHandler_1 = require("../messageHandler");
const WebSocketManager_1 = require("../WebSocketManager");
describe("WebSocketManager", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        // clear MockWSServer instances
        ws_1.WebSocketServer.instances.length = 0;
    });
    it("should ignore connection when authenticateWebSocket returns null", async () => {
        auth_1.authenticateWebSocket.mockResolvedValue(null);
        const manager = new WebSocketManager_1.WebSocketManager({});
        const wssInstance = ws_1.WebSocketServer.instances[0];
        const ws = {
            send: jest.fn(),
            on: jest.fn(),
        };
        // simulate incoming connection
        wssInstance.simulateConnection(ws, { url: "/?token=bad" });
        // wait for async handler to complete
        await new Promise((r) => setImmediate(r));
        expect(manager.getConnectedUsersCount()).toBe(0);
    });
    it("should register client and call sendWelcomeMessage and handle messages", async () => {
        const decoded = { userId: "u1", email: "a@b.com" };
        auth_1.authenticateWebSocket.mockResolvedValue(decoded);
        const manager = new WebSocketManager_1.WebSocketManager({});
        const wssInstance = ws_1.WebSocketServer.instances[0];
        // create ws mock that supports on and triggering events
        const messageHandlers = {};
        const ws = {
            send: jest.fn(),
            readyState: ws_1.WebSocket.OPEN,
            on: (event, fn) => {
                messageHandlers[event] = fn;
            },
        };
        wssInstance.simulateConnection(ws, { url: "/?token=ok" });
        // wait for async handler to complete
        await new Promise((r) => setImmediate(r));
        // client should be registered
        expect(manager.getConnectedUsersCount()).toBe(1);
        expect(manager.getConnectedUsers()).toContain("u1");
        // sendWelcomeMessage should be called with ws and userId
        expect(messageHandler_1.sendWelcomeMessage).toHaveBeenCalledWith(ws, "u1");
        // Simulate incoming message (JSON) and expect handleMessage to be called
        const payload = { hello: "world" };
        const handler = messageHandlers["message"];
        expect(handler).toBeDefined();
        handler(JSON.stringify(payload));
        expect(messageHandler_1.handleMessage).toHaveBeenCalledWith(ws, payload);
        // simulate close and ensure client removed
        const closeHandler = messageHandlers["close"];
        expect(closeHandler).toBeDefined();
        closeHandler();
        expect(manager.getConnectedUsersCount()).toBe(0);
    });
    it("broadcastLessonStatusUpdate should send to all clients when no tutorId", async () => {
        auth_1.authenticateWebSocket.mockResolvedValue({
            userId: "u1",
            email: "a",
        });
        const manager = new WebSocketManager_1.WebSocketManager({});
        const wssInstance = ws_1.WebSocketServer.instances[0];
        const ws1Handlers = {};
        const ws1 = {
            send: jest.fn(),
            readyState: ws_1.WebSocket.OPEN,
            on: (e, fn) => (ws1Handlers[e] = fn),
        };
        // connect first client
        wssInstance.simulateConnection(ws1, { url: "/?token=ok1" });
        // wait for first connection
        await new Promise((r) => setImmediate(r));
        // second client
        auth_1.authenticateWebSocket.mockResolvedValue({
            userId: "u2",
            email: "b",
        });
        const ws2Handlers = {};
        const ws2 = {
            send: jest.fn(),
            readyState: ws_1.WebSocket.OPEN,
            on: (e, fn) => (ws2Handlers[e] = fn),
        };
        wssInstance.simulateConnection(ws2, { url: "/?token=ok2" });
        // wait for second connection
        await new Promise((r) => setImmediate(r));
        manager.broadcastLessonStatusUpdate("lesson1", "COMPLETED");
        expect(ws1.send).toHaveBeenCalled();
        expect(ws2.send).toHaveBeenCalled();
    });
    it("sendToUser should send only to specified user", async () => {
        auth_1.authenticateWebSocket.mockResolvedValue({
            userId: "u1",
            email: "a",
        });
        const manager = new WebSocketManager_1.WebSocketManager({});
        const wssInstance = ws_1.WebSocketServer.instances[0];
        const ws = {
            send: jest.fn(),
            readyState: ws_1.WebSocket.OPEN,
            on: jest.fn(),
        };
        wssInstance.simulateConnection(ws, { url: "/?token=ok" });
        // wait for connection to be registered
        await new Promise((r) => setImmediate(r));
        const resultTrue = manager.sendToUser("u1", { test: 1 });
        expect(resultTrue).toBe(true);
        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ test: 1 }));
        const resultFalse = manager.sendToUser("missing", { test: 2 });
        expect(resultFalse).toBe(false);
    });
});
//# sourceMappingURL=WebSocketManager.test.js.map