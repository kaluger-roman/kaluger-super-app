export type SinkPushManagerOptions = {
  endpoint: string;
  storageKey: string;
  permissionKey: string;
};

// Headless Chromium denies notifications and has no push service: the page gets a permission the
// student grants in the "system dialog" and a PushManager whose subscription points at the e2e
// backend's sink, with real P-256 keys so the backend can encrypt. Both live in localStorage, so
// they survive reloads like real ones. Runs in the page as an init script, so it uses nothing from
// outside its own body. Kept apart from call.ts: under vitest, importing @playwright/test
// tries localhost:3000 and fails with an unhandled error.
export const fakeSinkPushManager = ({
  endpoint,
  storageKey,
  permissionKey,
}: SinkPushManagerOptions): void => {
  type StoredKeys = { p256dh: string; auth: string };
  const toBase64Url = (bytes: ArrayBuffer | Uint8Array): string =>
    btoa(String.fromCharCode(...Array.from(new Uint8Array(bytes))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const readKeys = (): StoredKeys | null => {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredKeys) : null;
  };
  const toSubscription = (keys: StoredKeys) => ({
    endpoint,
    expirationTime: null,
    options: { userVisibleOnly: true, applicationServerKey: null },
    getKey: () => null,
    toJSON: () => ({ endpoint, expirationTime: null, keys }),
    unsubscribe: async () => {
      localStorage.removeItem(storageKey);
      return true;
    },
  });
  const createKeys = async (): Promise<StoredKeys> => {
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ]);
    const publicKey = await crypto.subtle.exportKey("raw", pair.publicKey);
    return {
      p256dh: toBase64Url(publicKey),
      auth: toBase64Url(crypto.getRandomValues(new Uint8Array(16))),
    };
  };
  PushManager.prototype.getSubscription = async () => {
    const keys = readKeys();
    return (keys ? toSubscription(keys) : null) as unknown as PushSubscription;
  };
  PushManager.prototype.subscribe = async () => {
    const keys = readKeys() ?? (await createKeys());
    localStorage.setItem(storageKey, JSON.stringify(keys));
    return toSubscription(keys) as unknown as PushSubscription;
  };
  Object.defineProperty(Notification, "permission", {
    configurable: true,
    get: () => localStorage.getItem(permissionKey) ?? "default",
  });
  Notification.requestPermission = async () => {
    localStorage.setItem(permissionKey, "granted");
    return "granted";
  };
};
