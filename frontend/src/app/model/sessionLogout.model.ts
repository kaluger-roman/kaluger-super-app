import { createEvent, sample } from "effector";

import { studentUserModel, userModel } from "@entities";
import { sessionCleanupModel } from "@features/logoutConfirmation";
import { callEntryModel, callModel } from "@features/videoCall";

import * as webSocketModel from "./webSocket.model";

// The session's socket closes next, and a closed socket only pauses a call (039): the call ends
// over it now instead of waiting for the grace period (spec, Edge Cases).
const callEndDue = createEvent();

// Only a call on that session's socket goes with it: the other session of the tab keeps its call.
sample({
  clock: sessionCleanupModel.logoutStarted,
  source: callModel.$callRole,
  filter: (role, loggedOut) => role === loggedOut,
  fn: () => undefined,
  target: callEndDue,
});
// The session ended without a logout here (another tab logged out, this tab switched accounts).
sample({
  clock: [webSocketModel.tutorSessionEndedElsewhere, userModel.tutorSessionCleared],
  source: callModel.$callRole,
  filter: (role) => role === "tutor",
  fn: () => undefined,
  target: callEndDue,
});
sample({
  clock: studentUserModel.studentSessionEndedElsewhere,
  source: callModel.$callRole,
  filter: (role) => role === "student",
  fn: () => undefined,
  target: callEndDue,
});

sample({
  clock: callEndDue,
  source: callModel.$callPhase,
  filter: (phase) => phase === "outgoing",
  fn: () => undefined,
  target: callModel.cancelCall,
});
sample({
  clock: callEndDue,
  source: callModel.$callPhase,
  filter: (phase) => phase === "incoming",
  fn: () => undefined,
  target: callEntryModel.rejectRequested,
});
sample({
  clock: callEndDue,
  source: callModel.$callPhase,
  filter: (phase) => phase === "connecting" || phase === "active",
  fn: () => undefined,
  target: callModel.hangUp,
});
