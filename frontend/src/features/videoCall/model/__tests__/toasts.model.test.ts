import { describe, expect, it } from "vitest";

import { notificationsModel } from "@shared";

import * as callModel from "../call.model";
import "../toasts.model";
import { collectEvents } from "./storeProbe";

const collectToasts = (trigger: () => void) => {
  const errors = collectEvents(notificationsModel.showErrorEvent);
  const infos = collectEvents(notificationsModel.showInfoEvent);
  trigger();
  errors.unwatch();
  infos.unwatch();
  return { errors: errors.calls, infos: infos.calls };
};

describe("features/videoCall/model call toasts", () => {
  it("should show an error toast when the peer is offline", () => {
    const toasts = collectToasts(() => callModel.unavailableReceived());
    expect(toasts.errors).toContain("Собеседник сейчас не в сети");
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
    const toasts = collectToasts(() => callModel.canceledReceived());
    expect(toasts.infos).toContain("Вызов отменён");
    expect(toasts.errors).toHaveLength(0);
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
});
