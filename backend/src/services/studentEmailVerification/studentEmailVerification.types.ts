export type SendCodeResult =
  | { ok: true }
  | { ok: false; reason: "already_verified" | "send_failed" };

export type VerifyCodeResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "already_verified"
        | "no_active_code"
        | "expired"
        | "wrong_code"
        | "attempts_exceeded";
    };

export type ResendResult =
  | { ok: true }
  | {
      ok: false;
      reason: "already_verified" | "cooldown" | "send_failed";
      retryAfterSeconds?: number;
    };
