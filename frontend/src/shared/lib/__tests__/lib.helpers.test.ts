import { describe, it, expect } from "vitest";

import {
  formatCurrency,
  validateEmail,
  validatePhone,
  truncateText,
  capitalizeFirst,
} from "../lib.helpers";

describe("lib.helpers", () => {
  describe("formatCurrency", () => {
    it("should format number as RUB currency", () => {
      const result = formatCurrency(1000);
      expect(result).toContain("1");
      expect(result).toContain("000");
      expect(result).toContain("₽");
    });

    it("should format zero correctly", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0");
      expect(result).toContain("₽");
    });

    it("should format large numbers with spaces", () => {
      const result = formatCurrency(1000000);
      expect(result).toContain("1");
      expect(result).toContain("000");
      expect(result).toContain("₽");
    });

    it("should not show decimal places", () => {
      const result = formatCurrency(1500.99);
      expect(result).not.toContain(".");
      expect(result).toContain("1");
      expect(result).toContain("501");
    });

    it("should handle negative numbers", () => {
      const result = formatCurrency(-1000);
      expect(result).toContain("-");
      expect(result).toContain("1");
      expect(result).toContain("000");
    });
  });

  describe("validateEmail", () => {
    it("should validate correct email", () => {
      expect(validateEmail("test@example.com")).toBe(true);
    });

    it("should validate email with subdomain", () => {
      expect(validateEmail("user@mail.example.com")).toBe(true);
    });

    it("should reject email without @", () => {
      expect(validateEmail("testexample.com")).toBe(false);
    });

    it("should reject email without domain", () => {
      expect(validateEmail("test@")).toBe(false);
    });

    it("should reject email without local part", () => {
      expect(validateEmail("@example.com")).toBe(false);
    });

    it("should reject email without TLD", () => {
      expect(validateEmail("test@example")).toBe(false);
    });

    it("should reject email with spaces", () => {
      expect(validateEmail("test @example.com")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("validatePhone", () => {
    it("should validate phone with country code", () => {
      expect(validatePhone("+79991234567")).toBe(true);
    });

    it("should validate phone with spaces", () => {
      expect(validatePhone("+7 999 123 45 67")).toBe(true);
    });

    it("should validate phone with dashes", () => {
      expect(validatePhone("+7-999-123-45-67")).toBe(true);
    });

    it("should validate phone with parentheses", () => {
      expect(validatePhone("+7(999)1234567")).toBe(true);
    });

    it("should validate plain 10 digit number", () => {
      expect(validatePhone("9991234567")).toBe(true);
    });

    it("should reject short numbers", () => {
      expect(validatePhone("123")).toBe(false);
    });

    it("should reject letters in phone", () => {
      expect(validatePhone("+7999abc4567")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(validatePhone("")).toBe(false);
    });
  });

  describe("truncateText", () => {
    it("should truncate long text", () => {
      expect(truncateText("Hello world", 5)).toBe("Hello...");
    });

    it("should not truncate short text", () => {
      expect(truncateText("Hello", 10)).toBe("Hello");
    });

    it("should handle exact length", () => {
      expect(truncateText("Hello", 5)).toBe("Hello");
    });

    it("should truncate to zero length", () => {
      expect(truncateText("Hello", 0)).toBe("...");
    });

    it("should handle empty string", () => {
      expect(truncateText("", 5)).toBe("");
    });

    it("should truncate with single character", () => {
      expect(truncateText("Hello", 1)).toBe("H...");
    });
  });

  describe("capitalizeFirst", () => {
    it("should capitalize first letter", () => {
      expect(capitalizeFirst("hello")).toBe("Hello");
    });

    it("should lowercase remaining letters", () => {
      expect(capitalizeFirst("HELLO")).toBe("Hello");
    });

    it("should handle single character", () => {
      expect(capitalizeFirst("h")).toBe("H");
    });

    it("should handle mixed case", () => {
      expect(capitalizeFirst("hELLO wORLD")).toBe("Hello world");
    });

    it("should handle empty string", () => {
      expect(capitalizeFirst("")).toBe("");
    });

    it("should handle string with spaces", () => {
      expect(capitalizeFirst("hello world")).toBe("Hello world");
    });
  });
});
