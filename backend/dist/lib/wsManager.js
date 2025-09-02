"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketManager = exports.setWebSocketManager = void 0;
let wsManagerInstance = null;
const setWebSocketManager = (manager) => {
    wsManagerInstance = manager;
};
exports.setWebSocketManager = setWebSocketManager;
const getWebSocketManager = () => {
    return wsManagerInstance;
};
exports.getWebSocketManager = getWebSocketManager;
//# sourceMappingURL=wsManager.js.map