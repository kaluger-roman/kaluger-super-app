import { allSettled, createWatch, fork } from "effector";
import type { Scope, Unit } from "effector";
import { describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import * as callModel from "../call.model";
import * as callNotificationOpenModel from "../callNotificationOpen.model";
import * as callResumeModel from "../callResume.model";
import "../toasts.model";
import { collectEvents } from "./storeProbe";

const watch = <T>(scope: Scope, unit: Unit<T>): T[] => {
  const calls: T[] = [];
  createWatch({ unit, fn: (value) => calls.push(value), scope });
  return calls;
};

const collectToasts = (trigger: () => void) => {
  const errors = collectEvents(notificationsModel.showErrorEvent);
  const infos = collectEvents(notificationsModel.showInfoEvent);
  trigger();
  errors.unwatch();
  infos.unwatch();
  return { errors: errors.calls, infos: infos.calls };
};

describe("features/videoCall/model call toasts", () => {
  it("should name the peer role in the offline toast", () => {
    expect(collectToasts(() => callModel.unavailableReceived("student")).errors).toContain(
      "Ученик сейчас не в сети"
    );
    expect(collectToasts(() => callModel.unavailableReceived("tutor")).errors).toContain(
      "Преподаватель сейчас не в сети"
    );
  });

  it("should show an error toast when the peer is busy", () => {
    const toasts = collectToasts(() => callModel.busyReceived());
    expect(toasts.errors).toContain("Абонент занят");
  });

  it("should show an error toast when there is no answer", () => {
    const toasts = collectToasts(() => callModel.noAnswerReceived());
    expect(toasts.errors).toContain("Нет ответа");
  });

  it("should show an error toast when the call is rejected", () => {
    const toasts = collectToasts(() => callModel.rejectedReceived());
    expect(toasts.errors).toContain("Вызов отклонён");
  });

  it("should show an info toast when the caller cancels", () => {
    const toasts = collectToasts(() =>
      callModel.canceledReceived({ reason: "canceled", callerName: "Анна" })
    );
    expect(toasts.infos).toContain("Вызов отменён");
    expect(toasts.errors).toHaveLength(0);
  });

  it("should show a missed-call toast when ringing timed out", () => {
    const toasts = collectToasts(() =>
      callModel.canceledReceived({ reason: "timeout", callerName: "Анна" })
    );
    expect(toasts.infos).toContain("Пропущенный вызов от Анна");
  });

  it("should show an info toast when the peer hangs up", () => {
    const toasts = collectToasts(() => callModel.callEnded("hangup"));
    expect(toasts.infos).toContain("Собеседник завершил звонок");
    expect(toasts.errors).toHaveLength(0);
  });

  it("should show an error toast when the peer drops off or has no devices", () => {
    expect(collectToasts(() => callModel.callEnded("peer_disconnected")).errors).toContain(
      "Собеседник отключился"
    );
    expect(collectToasts(() => callModel.callEnded("media_unavailable")).errors).toContain(
      "У собеседника нет доступа к камере и микрофону"
    );
  });

  it("should show an error toast when media acquisition fails", () => {
    const toasts = collectToasts(() => callModel.mediaAcquisitionFailed());
    expect(toasts.errors).toContain("Нет доступа к камере и микрофону");
  });

  it("should surface the server error text on callErrorReceived", () => {
    const toasts = collectToasts(() => callModel.callErrorReceived("Что-то пошло не так"));
    expect(toasts.errors).toContain("Что-то пошло не так");
  });

  it("should surface the connection error text on callFailed", () => {
    const toasts = collectToasts(() => callModel.callFailed("Соединение потеряно"));
    expect(toasts.errors).toContain("Соединение потеряно");
  });

  it("should show an error toast when the peer did not come back in time", () => {
    const toasts = collectToasts(() => callModel.callEnded("peer_not_returned"));
    expect(toasts.errors).toEqual(["Собеседник не вернулся в звонок"]);
    expect(toasts.infos).toHaveLength(0);
  });

  it("should tell a returning participant that the call is over", () => {
    const toasts = collectToasts(() => callResumeModel.returnedToEndedCall());
    expect(toasts.infos).toEqual(["Звонок завершён"]);
    expect(toasts.errors).toHaveLength(0);
  });

  it("should not end a call with a toast when only the own socket was lost", async () => {
    vi.useFakeTimers();
    const scope = fork({
      values: [
        [callModel.$callPhase, "active"],
        [callModel.$callId, "c-1"],
        [callModel.$callRole, "tutor"],
      ],
    });
    const errors = watch(scope, notificationsModel.showErrorEvent);
    const infos = watch(scope, notificationsModel.showInfoEvent);

    // The grace period's patronum delay keeps allSettled pending until the clock runs out.
    void allSettled(callModel.transportDisconnected, { scope, params: "tutor" });
    await vi.advanceTimersByTimeAsync(0);

    expect(scope.getState(callModel.$callPhase)).toBe("active");
    expect(errors).toEqual([]);
    expect(infos).toEqual([]);
    await vi.runOnlyPendingTimersAsync();
  });

  it("should drop a call silently when another window took it", () => {
    const toasts = collectToasts(() => callModel.callEndedLocally());
    expect(toasts.errors).toHaveLength(0);
    expect(toasts.infos).toHaveLength(0);
  });

  it("should tell that the call of an opened notification is already over", () => {
    const toasts = collectToasts(() => callNotificationOpenModel.staleCallNotificationOpened());
    expect(toasts.infos).toEqual(["Звонок уже завершён"]);
    expect(toasts.errors).toHaveLength(0);
  });
});
