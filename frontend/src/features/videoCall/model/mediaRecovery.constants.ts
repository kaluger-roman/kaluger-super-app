// ICE that stays "disconnected" this long is restarted (a network switch, a sleeping peer).
export const ICE_DISCONNECTED_RESTART_MS = 3000;
// Media that did not come back within the reconnect grace period ends the call.
export const MEDIA_RECOVERY_TIMEOUT_MS = 180_000;
