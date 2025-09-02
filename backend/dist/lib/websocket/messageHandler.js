"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeMessage = exports.handleMessage = void 0;
const handleMessage = (ws, data) => {
    // Handle different message types here
    console.log(`Received message from ${ws.userId}:`, data);
    // Echo back for now (you can implement specific handlers)
    ws.send(JSON.stringify({
        type: "message_received",
        originalMessage: data,
    }));
};
exports.handleMessage = handleMessage;
const sendWelcomeMessage = (ws, userId) => {
    ws.send(JSON.stringify({
        type: "connection_established",
        message: "WebSocket connection established",
        userId,
    }));
};
exports.sendWelcomeMessage = sendWelcomeMessage;
//# sourceMappingURL=messageHandler.js.map