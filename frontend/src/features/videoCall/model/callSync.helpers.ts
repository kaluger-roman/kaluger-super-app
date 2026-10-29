import type { CallStateReceived } from "./callResume.types";
import type {
  NotificationAnswerSource,
  NotificationOutcome,
  ReplyCheck,
  ReplyCheckSource,
  StaleAcceptSource,
} from "./callSync.types";
import type { CallRole } from "./signaling.types";
import { sendToRoles, toSyncMessage } from "./transport.helpers";

// Resolves with the roles the request went out on.
export const requestCallSync = (roles: readonly CallRole[]): CallRole[] =>
  sendToRoles(roles, toSyncMessage());

// Only the socket of the page's call is checked: a dead socket of another role costs nothing. While
// a tapped notification waits for its call, every socket asked is: the call may come on any of them.
export const toReplyCheck = (
  { role, notification, generation }: ReplyCheckSource,
  synced: readonly CallRole[]
): ReplyCheck | null => {
  const roles = notification === null ? synced.filter((asked) => asked === role) : [...synced];
  return roles.length > 0 ? { roles, generation: generation + 1 } : null;
};

// A socket that comes back while the page is hidden asks only about the page's own call: a call
// the page does not have is brought back once someone looks at the screen.
export const toReadySync = (
  { visible, role }: { visible: boolean; role: CallRole | null },
  ready: CallRole
): CallRole[] | null => (visible || role === ready ? [ready] : null);

// An accept of a call the page does not hold is not hung up: call_state decides it (restore, or
// the page repeats its own end signal). A hidden page without a call of the role does not ask: it
// would take the call with camera and sound where nobody looks; it asks once it is looked at.
export const toStaleAcceptSync = (
  { visible, role, pending }: StaleAcceptSource,
  accepted: CallRole
): CallRole[] | null =>
  pending.includes(accepted) ? null : toReadySync({ visible, role }, accepted);

export const withRoles = (pending: CallRole[], added: readonly CallRole[]): CallRole[] => [
  ...pending.filter((role) => !added.includes(role)),
  ...added,
];

export const withoutRole = (pending: CallRole[], removed: CallRole): CallRole[] =>
  pending.includes(removed) ? pending.filter((role) => role !== removed) : pending;

// A tab may hold two sessions: the answer of one role without the call settles nothing while the
// other role, asked too, may still bring it.
export const toNotificationOutcome = (
  { pending, asked }: NotificationAnswerSource,
  { role, call }: CallStateReceived
): NotificationOutcome | null => {
  if (pending === null) return null;
  if (call?.callId === pending) return "matched";
  return withoutRole(asked, role).length === 0 ? "stale" : null;
};
