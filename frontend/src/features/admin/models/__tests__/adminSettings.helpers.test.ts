import { describe, it, expect } from "vitest";

import {
  formatTestEmailSent,
  getAlertEmailError,
  isAlertEmailValid,
  toSettingsPayload,
} from "../adminSettings.helpers";

const longEmail = (length: number) => `${"a".repeat(length - "@example.com".length)}@example.com`;

describe("features/admin/models/adminSettings.helpers", () => {
  describe("getAlertEmailError", () => {
    it.each(["", "   "])("should accept an empty address «%s»", (input) => {
      expect(getAlertEmailError(input)).toBeNull();
    });

    it("should accept a valid address with spaces around it", () => {
      expect(getAlertEmailError("  admin@example.com ")).toBeNull();
    });

    it.each(["admin@example", "admin", "admin @example.com", "@example.com"])(
      "should reject «%s»",
      (input) => {
        expect(getAlertEmailError(input)).toBe("Некорректный email");
      }
    );

    it("should accept 254 characters and reject 255", () => {
      expect(getAlertEmailError(longEmail(254))).toBeNull();
      expect(getAlertEmailError(longEmail(255))).toBe("Некорректный email");
    });
  });

  it("should tell whether the input can be saved", () => {
    expect(isAlertEmailValid({ alertEmail: "admin@example.com", alertEmailEnabled: true })).toBe(
      true
    );
    expect(isAlertEmailValid({ alertEmail: "admin@example", alertEmailEnabled: true })).toBe(false);
  });

  describe("toSettingsPayload", () => {
    it("should trim the address", () => {
      expect(
        toSettingsPayload({ alertEmail: " admin@example.com  ", alertEmailEnabled: false })
      ).toEqual({ alertEmail: "admin@example.com", alertEmailEnabled: false });
    });

    it.each(["", "  "])("should send an explicit null for «%s»", (alertEmail) => {
      expect(toSettingsPayload({ alertEmail, alertEmailEnabled: true })).toEqual({
        alertEmail: null,
        alertEmailEnabled: true,
      });
    });
  });

  it("should name the address the test letter went to", () => {
    expect(formatTestEmailSent("admin@example.com")).toBe("Письмо отправлено на admin@example.com");
  });
});
