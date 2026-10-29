import type { CallRole } from "./signaling.types";

export type ReplyCheck = {
  roles: CallRole[];
  generation: number;
};

export type StaleAcceptSource = {
  visible: boolean;
  // The page's call role, if any.
  role: CallRole | null;
  // Roles whose call_state has not come yet.
  pending: CallRole[];
};

export type ReplyCheckSource = {
  role: CallRole | null;
  // The call of a tapped notification the page still waits for.
  notification: string | null;
  generation: number;
};

// matched: a snapshot carries the call of the tapped notification; stale: every socket asked
// answered without it.
export type NotificationOutcome = "matched" | "stale";

export type NotificationAnswerSource = {
  pending: string | null;
  // Roles asked with call_sync whose call_state has not come yet.
  asked: CallRole[];
};
