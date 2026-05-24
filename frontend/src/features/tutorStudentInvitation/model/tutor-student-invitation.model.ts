import {
  createEffect,
  createEvent,
  createStore,
  sample,
} from "effector";
import { createGate } from "effector-react";

import type { InvitationStatusResponse } from "@shared";
import { studentInvitationsApi } from "@shared";
import { notificationsModel } from "@shared/model";

import { extractAxiosError } from "./tutor-student-invitation.helpers";

// Lifecycle gate — open while a tutor's student card is mounted.
export const InvitationManagerGate = createGate<{ studentId: string }>();

// Currently focused student card (in tutor's UI).
export const $studentId = createStore<string | null>(null);
export const studentIdSet = createEvent<string | null>();

export const $status = createStore<InvitationStatusResponse | null>(null);
// Ephemeral URL — есть только сразу после issueInvitation; пропадает при
// смене карточки или перезагрузке (см. R-16 в research.md).
export const $ephemeralInviteUrl = createStore<string | null>(null);
export const $error = createStore<string | null>(null);
export const $copySuccess = createStore(false);

export const loadStatusFx = createEffect(
  async (studentId: string) => studentInvitationsApi.getStatus(studentId)
);

export const issueInvitationFx = createEffect(async (studentId: string) =>
  studentInvitationsApi.issueInvitation(studentId)
);

export const revokeInvitationFx = createEffect(async (studentId: string) =>
  studentInvitationsApi.revoke(studentId)
);

export const inviteUrlCopyRequested = createEvent();

export const $isLoading = loadStatusFx.pending;
export const $isIssuing = issueInvitationFx.pending;
export const $isRevoking = revokeInvitationFx.pending;

sample({ clock: studentIdSet, target: $studentId });

// Bridge the Gate lifecycle to studentIdSet — replaces the InvitationManager
// component's useEffect (см. docs/conventions/frontend.md — useEffect for
// initial data fetching is forbidden; use Gate.open instead).
sample({
  clock: InvitationManagerGate.open,
  fn: ({ studentId }) => studentId,
  target: studentIdSet,
});

sample({
  clock: InvitationManagerGate.close,
  fn: () => null,
  target: studentIdSet,
});

// При смене карточки сбрасываем ephemeral URL — он не должен пересекаться
// между разными учениками.
sample({
  clock: studentIdSet,
  fn: () => null,
  target: [$ephemeralInviteUrl, $error, $status],
});

sample({
  clock: studentIdSet,
  filter: (id): id is string => id !== null,
  target: loadStatusFx,
});

sample({ clock: loadStatusFx.doneData, target: $status });

sample({
  clock: issueInvitationFx.doneData,
  fn: ({ inviteUrl }) => inviteUrl,
  target: $ephemeralInviteUrl,
});

sample({
  clock: issueInvitationFx.done,
  source: $studentId,
  filter: (id): id is string => id !== null,
  target: loadStatusFx,
});

sample({
  clock: revokeInvitationFx.done,
  source: $studentId,
  filter: (id): id is string => id !== null,
  target: loadStatusFx,
});

sample({
  clock: revokeInvitationFx.done,
  fn: () => null,
  target: $ephemeralInviteUrl,
});

sample({
  clock: issueInvitationFx.done,
  fn: () => "Приглашение создано",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: revokeInvitationFx.done,
  fn: () => "Приглашение отозвано",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: [issueInvitationFx.failData, revokeInvitationFx.failData],
  fn: extractAxiosError,
  target: $error,
});

sample({
  clock: [issueInvitationFx.done, revokeInvitationFx.done, loadStatusFx.done],
  fn: () => null,
  target: $error,
});

sample({
  clock: inviteUrlCopyRequested,
  source: $ephemeralInviteUrl,
  filter: (url): url is string => url !== null && navigator.clipboard != null,
  target: createEffect(async (url: string) => {
    await navigator.clipboard.writeText(url);
  }),
});

sample({
  clock: inviteUrlCopyRequested,
  fn: () => true,
  target: $copySuccess,
});
