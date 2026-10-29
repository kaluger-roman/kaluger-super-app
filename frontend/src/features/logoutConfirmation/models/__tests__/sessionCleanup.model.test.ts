import { allSettled, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { notificationsModel, studentUserModel, userModel } from "@entities";

import { server } from "../../../../__tests__/mocks/server";
import { LOGOUT_CLEANUP_TIMEOUT_MS } from "../sessionCleanup.constants";
import { withTimeout } from "../sessionCleanup.helpers";
import * as sessionCleanupModel from "../sessionCleanup.model";

const ENDPOINT = "https://push.example.com/device-1";

const deviceWith = (subscribed: boolean) => {
  const subscription = { endpoint: ENDPOINT, unsubscribe: vi.fn().mockResolvedValue(true) };
  const registration = {
    pushManager: { getSubscription: vi.fn().mockResolvedValue(subscribed ? subscription : null) },
  } as unknown as ServiceWorkerRegistration;
  return { subscription, registration };
};

const recordUnsubscribes = (path: string) => {
  const calls: { endpoint: string; authorized: boolean }[] = [];
  server.use(
    http.delete(`*/api/${path}`, async ({ request }) => {
      const { endpoint } = (await request.json()) as { endpoint: string };
      calls.push({ endpoint, authorized: request.headers.has("Authorization") });
      return HttpResponse.json({ message: "Подписка удалена" });
    })
  );
  return calls;
};

const watchUnit = (unit: Parameters<typeof createWatch>[0]["unit"], scope: Scope) => {
  const fn = vi.fn();
  createWatch({ unit, fn, scope });
  return fn;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("features/logoutConfirmation/models/sessionCleanup.model", () => {
  it("should remove the tutor's device subscription with the token still set, then log out", async () => {
    localStorage.setItem("authToken", "tutor-token");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const calls = recordUnsubscribes("push/unsubscribe");
    const { subscription, registration } = deviceWith(true);
    const scope = fork({ values: [[notificationsModel.$serviceWorkerRegistration, registration]] });
    const loggedOut = watchUnit(userModel.logoutUser, scope);

    await allSettled(sessionCleanupModel.tutorLogoutConfirmed, { scope });

    expect(calls).toEqual([{ endpoint: ENDPOINT, authorized: true }]);
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(loggedOut).toHaveBeenCalledTimes(1);
  });

  it("should remove the student's device subscription, then log the student out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const calls = recordUnsubscribes("student-push/unsubscribe");
    const { subscription, registration } = deviceWith(true);
    const scope = fork({
      values: [[notificationsModel.$serviceWorkerRegistration, registration]],
      handlers: [[studentUserModel.studentLogoutFx, () => undefined]],
    });
    const loggedOut = watchUnit(studentUserModel.studentLoggedOut, scope);

    await allSettled(sessionCleanupModel.studentLogoutRequested, { scope });

    expect(calls.map(({ endpoint }) => endpoint)).toEqual([ENDPOINT]);
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(loggedOut).toHaveBeenCalledTimes(1);
  });

  it("should log out without requests on a device without a subscription", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { registration } = deviceWith(false);
    const scope = fork({ values: [[notificationsModel.$serviceWorkerRegistration, registration]] });
    const loggedOut = watchUnit(userModel.logoutUser, scope);

    await allSettled(sessionCleanupModel.tutorLogoutConfirmed, { scope });

    expect(loggedOut).toHaveBeenCalledTimes(1);
  });

  it("should still log out and drop the browser subscription when the server fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(
      http.delete("*/api/push/unsubscribe", () =>
        HttpResponse.json({ error: "Подписка не найдена" }, { status: 404 })
      )
    );
    const { subscription, registration } = deviceWith(true);
    const scope = fork({ values: [[notificationsModel.$serviceWorkerRegistration, registration]] });
    const loggedOut = watchUnit(userModel.logoutUser, scope);

    await allSettled(sessionCleanupModel.tutorLogoutConfirmed, { scope });

    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(loggedOut).toHaveBeenCalledTimes(1);
  });

  it("should not wait for a hanging cleanup longer than the limit", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const registration = {
      pushManager: { getSubscription: () => new Promise(() => undefined) },
    } as unknown as ServiceWorkerRegistration;
    const scope = fork({ values: [[notificationsModel.$serviceWorkerRegistration, registration]] });
    const loggedOut = watchUnit(userModel.logoutUser, scope);

    void allSettled(sessionCleanupModel.tutorLogoutConfirmed, { scope });
    await vi.advanceTimersByTimeAsync(LOGOUT_CLEANUP_TIMEOUT_MS - 1);
    expect(loggedOut).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(loggedOut).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["tutor", sessionCleanupModel.tutorLogoutConfirmed],
    ["student", sessionCleanupModel.studentLogoutRequested],
  ] as const)("should announce the %s logout before the session ends", async (role, unit) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const scope = fork({ handlers: [[studentUserModel.studentLogoutFx, () => undefined]] });
    const started = watchUnit(sessionCleanupModel.logoutStarted, scope);
    const loggedOut = vi.fn();
    createWatch({ unit: userModel.logoutUser, fn: loggedOut, scope });
    createWatch({ unit: studentUserModel.studentLoggedOut, fn: loggedOut, scope });

    await allSettled(unit, { scope });

    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith(role);
    expect(started.mock.invocationCallOrder[0]).toBeLessThan(loggedOut.mock.invocationCallOrder[0]);
  });

  it("should ignore a second logout press while the first one is cleaning up", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const scope = fork({ handlers: [[studentUserModel.studentLogoutFx, () => undefined]] });
    const loggedOut = watchUnit(studentUserModel.studentLoggedOut, scope);

    await Promise.all([
      allSettled(sessionCleanupModel.studentLogoutRequested, { scope }),
      allSettled(sessionCleanupModel.studentLogoutRequested, { scope }),
    ]);

    expect(loggedOut).toHaveBeenCalledTimes(1);
  });
});

describe("withTimeout", () => {
  it("should pass the result and the error of a quick promise through", async () => {
    await expect(withTimeout(Promise.resolve(5), 100)).resolves.toBe(5);
    await expect(withTimeout(Promise.reject(new Error("boom")), 100)).rejects.toThrow("boom");
  });
});
