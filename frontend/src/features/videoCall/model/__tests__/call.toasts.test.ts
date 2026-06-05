import { afterEach, describe, expect, it, vi } from "vitest";

import { showNotification } from "@shared";

import "../call.toasts";
import {
  busyReceived,
  callErrorReceived,
  callFailed,
  canceledReceived,
  mediaAcquisitionFailed,
  noAnswerReceived,
  rejectedReceived,
  unavailableReceived,
} from "../call.model";

type Toast = { message: string; type: string };

const watchToasts = (): { calls: Toast[]; unsubscribe: () => void } => {
  const calls: Toast[] = [];
  const subscription = showNotification.watch((payload) => calls.push(payload));
  return { calls, unsubscribe: () => subscription.unsubscribe() };
};

describe("features/videoCall/model call toasts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should show an error toast when the peer is offline", () => {
    const toasts = watchToasts();
    unavailableReceived();
    toasts.unsubscribe();

    expect(toasts.calls).toContainEqual({
      message: "Собеседник сейчас не в сети",
      type: "error",
    });
  });

  it("should show an error toast when the peer is busy", () => {
    const toasts = watchToasts();
    busyReceived();
    toasts.unsubscribe();

    expect(toasts.calls).toContainEqual({
      message: "Абонент занят",
      type: "error",
    });
  });

  it("should show an error toast when there is no answer", () => {
    const toasts = watchToasts();
    noAnswerReceived();
    toasts.unsubscribe();

    expect(toasts.calls).toContainEqual({
      message: "Нет ответа",
      type: "error",
    });
  });

  it("should show an error toast when the call is rejected", () => {
    const toasts = watchToasts();
    rejectedReceived();
    toasts.unsubscribe();

    expect(toasts.calls).toContainEqual({
      message: "Вызов отклонён",
      type: "error",
    });
  });

  it("should show an info toast when the caller cancels", () => {
    const toasts = watchToasts();
    canceledReceived();
    toasts.unsubscribe();

    expect(toasts.calls).toContainEqual({
      message: "Вызов отменён",
      type: "info",
    });
  });

  it("should show an error toast when media acquisition fails", () => {
    const toasts = watchToasts();
    mediaAcquisitionFailed();
    toasts.unsubscribe();

    expect(toasts.calls).toContainEqual({
      message: "Нет доступа к камере и микрофону",
      type: "error",
    });
  });

  it("should surface the server error text on callErrorReceived", () => {
    const toasts = watchToasts();
    callErrorReceived("Что-то пошло не так");
    toasts.unsubscribe();

    expect(toasts.calls).toContainEqual({
      message: "Что-то пошло не так",
      type: "error",
    });
  });

  it("should surface the connection error text on callFailed", () => {
    const toasts = watchToasts();
    callFailed("Соединение потеряно");
    toasts.unsubscribe();

    expect(toasts.calls).toContainEqual({
      message: "Соединение потеряно",
      type: "error",
    });
  });
});
