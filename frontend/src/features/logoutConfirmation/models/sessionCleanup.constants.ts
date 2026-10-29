// The device subscription is removed while the token still works; a slow network must not hold
// the logout longer than this.
export const LOGOUT_CLEANUP_TIMEOUT_MS = 3000;
