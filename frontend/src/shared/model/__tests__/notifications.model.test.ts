import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  showNotification,
  hideNotification,
  showSuccessEvent,
  showErrorEvent,
  showWarningEvent,
  showInfoEvent,
  $notification,
} from "../notifications.model";

describe("notifications.model", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe("showNotification", () => {
    it("should set notification with message and type", async () => {
      const scope = fork();

      await allSettled(showNotification, {
        scope,
        params: { message: "Test notification", type: "success" },
      });

      const notification = scope.getState($notification);
      expect(notification).toMatchObject({
        message: "Test notification",
        type: "success",
      });
      expect(notification?.id).toBeDefined();
    });

    it("should generate unique id for notification", async () => {
      const scope = fork();

      vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
      await allSettled(showNotification, {
        scope,
        params: { message: "First", type: "info" },
      });

      const firstNotification = scope.getState($notification);

      vi.setSystemTime(new Date("2025-01-01T00:00:01.000Z"));
      await allSettled(showNotification, {
        scope,
        params: { message: "Second", type: "info" },
      });

      const secondNotification = scope.getState($notification);

      expect(firstNotification?.id).not.toBe(secondNotification?.id);
    });
  });

  describe("hideNotification", () => {
    it("should clear notification", async () => {
      const scope = fork();

      await allSettled(showNotification, {
        scope,
        params: { message: "Test", type: "success" },
      });

      let notification = scope.getState($notification);
      expect(notification).not.toBeNull();

      await allSettled(hideNotification, { scope });

      notification = scope.getState($notification);
      expect(notification).toBeNull();
    });
  });

  describe("showSuccessEvent", () => {
    it("should create success notification", async () => {
      const scope = fork();

      await allSettled(showSuccessEvent, {
        scope,
        params: "Success message",
      });

      const notification = scope.getState($notification);
      expect(notification).toMatchObject({
        message: "Success message",
        type: "success",
      });
    });
  });

  describe("showErrorEvent", () => {
    it("should create error notification", async () => {
      const scope = fork();

      await allSettled(showErrorEvent, {
        scope,
        params: "Error message",
      });

      const notification = scope.getState($notification);
      expect(notification).toMatchObject({
        message: "Error message",
        type: "error",
      });
    });
  });

  describe("showWarningEvent", () => {
    it("should create warning notification", async () => {
      const scope = fork();

      await allSettled(showWarningEvent, {
        scope,
        params: "Warning message",
      });

      const notification = scope.getState($notification);
      expect(notification).toMatchObject({
        message: "Warning message",
        type: "warning",
      });
    });
  });

  describe("showInfoEvent", () => {
    it("should create info notification", async () => {
      const scope = fork();

      await allSettled(showInfoEvent, {
        scope,
        params: "Info message",
      });

      const notification = scope.getState($notification);
      expect(notification).toMatchObject({
        message: "Info message",
        type: "info",
      });
    });
  });

  describe("notification replacement", () => {
    it("should replace previous notification with new one", async () => {
      const scope = fork();

      await allSettled(showSuccessEvent, {
        scope,
        params: "First notification",
      });

      let notification = scope.getState($notification);
      expect(notification?.message).toBe("First notification");

      await allSettled(showErrorEvent, {
        scope,
        params: "Second notification",
      });

      notification = scope.getState($notification);
      expect(notification?.message).toBe("Second notification");
      expect(notification?.type).toBe("error");
    });
  });
});
