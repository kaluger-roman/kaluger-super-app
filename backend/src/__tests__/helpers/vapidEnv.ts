const VAPID_NAMES = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;

type VapidKeys = { publicKey: string; privateKey: string };

const PLACEHOLDER_KEYS: VapidKeys = {
  publicKey: "test-public-key",
  privateKey: "test-private-key",
};

// Configures web-push for every test of the enclosing block and puts the previous values back
// after each, so a test may delete a key. Placeholder keys do for a file that mocks web-push;
// one that encrypts real pushes passes `webpush.generateVAPIDKeys()`.
export const useVapidEnv = (keys: VapidKeys = PLACEHOLDER_KEYS): void => {
  let saved: Partial<Record<(typeof VAPID_NAMES)[number], string>> = {};

  beforeEach(() => {
    saved = Object.fromEntries(VAPID_NAMES.map((name) => [name, process.env[name]]));
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    process.env.VAPID_SUBJECT = "mailto:test@test.com";
  });

  afterEach(() => {
    VAPID_NAMES.forEach((name) => {
      const value = saved[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  });
};
