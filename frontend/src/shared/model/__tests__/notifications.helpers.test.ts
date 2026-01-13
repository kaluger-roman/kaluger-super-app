import { describe, it, expect, vi } from "vitest";

import { showSuccess, showError, showWarning, showInfo } from "../notifications.helpers";
import { showNotification } from "../notifications.model";

vi.mock("../notifications.model", () => ({
  showNotification: vi.fn(),
}));

describe("notifications.helpers", () => {
  describe("showSuccess", () => {
    it("should call showNotification with success type", () => {
      showSuccess("Success message");

      expect(showNotification).toHaveBeenCalledWith({
        message: "Success message",
        type: "success",
      });
    });
  });

  describe("showError", () => {
    it("should call showNotification with error type", () => {
      showError("Error message");

      expect(showNotification).toHaveBeenCalledWith({
        message: "Error message",
        type: "error",
      });
    });
  });

  describe("showWarning", () => {
    it("should call showNotification with warning type", () => {
      showWarning("Warning message");

      expect(showNotification).toHaveBeenCalledWith({
        message: "Warning message",
        type: "warning",
      });
    });
  });

  describe("showInfo", () => {
    it("should call showNotification with info type", () => {
      showInfo("Info message");

      expect(showNotification).toHaveBeenCalledWith({
        message: "Info message",
        type: "info",
      });
    });
  });
});
