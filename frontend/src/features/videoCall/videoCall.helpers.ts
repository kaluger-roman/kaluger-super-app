import type { CallHistoryDirection, CallHistoryStatus, CallLessonSummary } from "@entities";
import { SUBJECT_LABELS, formatDay, formatTimeRange } from "@shared";

import type { CallRole } from "./model/signaling.types";
import {
  CALL_STATUS_LABELS,
  OUTGOING_UNANSWERED_LABEL,
  PEER_AUDIO_UNAVAILABLE_TEXT,
  RECONNECTING_TEXT,
  STUDENT_MIC_SUSPENDED_TEXT,
  STUDENT_MINIMIZED_TEXT,
} from "./videoCall.constants";
import type { PeerPresenceState, TileInterruption } from "./videoCall.types";

export const formatCallLessonSubject = (lesson: CallLessonSummary): string =>
  SUBJECT_LABELS[lesson.subject];

export const formatCallLessonTime = (lesson: CallLessonSummary): string =>
  `${formatDay(lesson.startTime)} · ${formatTimeRange(lesson.startTime, lesson.endTime)}`;

export const formatCallLesson = (lesson: CallLessonSummary): string =>
  `${formatCallLessonSubject(lesson)} · ${formatCallLessonTime(lesson)}`;

export const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const formatCallDuration = (seconds: number | null): string => {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const paddedSeconds = rest.toString().padStart(2, "0");
  if (minutes < 60) {
    return `${minutes}:${paddedSeconds}`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${restMinutes}:${paddedSeconds}`;
};

// "Пропущен" belongs to the side that did not answer; the caller just got no answer.
export const getCallStatusLabel = (
  status: CallHistoryStatus,
  direction: CallHistoryDirection
): string =>
  status === "MISSED" && direction === "outgoing"
    ? OUTGOING_UNANSWERED_LABEL
    : CALL_STATUS_LABELS[status];

export const getCallDirectionLabel = (direction: CallHistoryDirection): string =>
  direction === "outgoing" ? "Исходящий" : "Входящий";

// `viewerRole` is the own role: only a tutor learns that the student left the app (FR-032).
// A peer whose video keeps going in the background is not interrupted at all (FR-033).
export const getPeerInterruption = (
  viewerRole: CallRole | null,
  { presence, videoSuspended }: PeerPresenceState
): TileInterruption | null => {
  if (presence === "disconnected") return { kind: "reconnecting", label: RECONNECTING_TEXT };
  if (presence !== "background" || !videoSuspended) return null;
  return viewerRole === "tutor"
    ? { kind: "minimized", label: STUDENT_MINIMIZED_TEXT }
    : { kind: "reconnecting", label: RECONNECTING_TEXT };
};

export const getPeerAudioNotice = (
  viewerRole: CallRole | null,
  { presence, audioSuspended }: PeerPresenceState
): string | null => {
  if (presence !== "background" || !audioSuspended) return null;
  return viewerRole === "tutor" ? STUDENT_MIC_SUSPENDED_TEXT : PEER_AUDIO_UNAVAILABLE_TEXT;
};

// A button focused by a mouse click must not hold the controls; an engine that does not know
// :focus-visible gets the old behaviour, where any focus holds them.
export const isKeyboardFocus = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  try {
    return target.matches(":focus-visible");
  } catch {
    return true;
  }
};

// A focused button that gets disabled or removed sends no blur, so the page itself is asked.
export const hasKeyboardFocusWithin = (selector: string): boolean => {
  const active = document.activeElement;
  return (
    active instanceof Element &&
    active.closest(selector) !== null &&
    !active.matches(":disabled") &&
    isKeyboardFocus(active)
  );
};
