import { allSettled, fork } from "effector";
import { describe, it, expect } from "vitest";

import {
  $onlyUnpaid,
  $onlyWithoutHomework,
  $paymentDateFrom,
  $paymentDateTo,
  $paymentDatePreset,
  setOnlyUnpaid,
  setOnlyWithoutHomework,
  setPaymentDateFrom,
  setPaymentDateTo,
  setPaymentDatePreset,
  resetPaymentDateFilter,
} from "../lessons-filters.model";

describe("lessons-filters.model", () => {
  describe("basic stores", () => {
    it("should have correct initial values", () => {
      const scope = fork();

      expect(scope.getState($onlyUnpaid)).toBe(false);
      expect(scope.getState($onlyWithoutHomework)).toBe(false);
      expect(scope.getState($paymentDateFrom)).toBeNull();
      expect(scope.getState($paymentDateTo)).toBeNull();
      expect(scope.getState($paymentDatePreset)).toBeNull();
    });

    it("should update $paymentDateFrom on setPaymentDateFrom", async () => {
      const scope = fork();
      const date = new Date("2026-03-01");

      await allSettled(setPaymentDateFrom, { scope, params: date });

      expect(scope.getState($paymentDateFrom)).toEqual(date);
    });

    it("should update $paymentDateTo on setPaymentDateTo", async () => {
      const scope = fork();
      const date = new Date("2026-03-31");

      await allSettled(setPaymentDateTo, { scope, params: date });

      expect(scope.getState($paymentDateTo)).toEqual(date);
    });
  });

  describe("resetPaymentDateFilter", () => {
    it("should reset all payment date stores to null", async () => {
      const scope = fork({
        values: [
          [$paymentDateFrom, new Date("2026-03-01")],
          [$paymentDateTo, new Date("2026-03-31")],
          [$paymentDatePreset, "currentMonth" as const],
        ],
      });

      await allSettled(resetPaymentDateFilter, { scope });

      expect(scope.getState($paymentDateFrom)).toBeNull();
      expect(scope.getState($paymentDateTo)).toBeNull();
      expect(scope.getState($paymentDatePreset)).toBeNull();
    });
  });

  describe("mutual exclusion with onlyUnpaid", () => {
    it("should reset payment date filter when onlyUnpaid is set to true", async () => {
      const scope = fork({
        values: [
          [$paymentDateFrom, new Date("2026-03-01")],
          [$paymentDateTo, new Date("2026-03-31")],
          [$paymentDatePreset, "currentMonth" as const],
        ],
      });

      await allSettled(setOnlyUnpaid, { scope, params: true });

      expect(scope.getState($onlyUnpaid)).toBe(true);
      expect(scope.getState($paymentDateFrom)).toBeNull();
      expect(scope.getState($paymentDateTo)).toBeNull();
      expect(scope.getState($paymentDatePreset)).toBeNull();
    });

    it("should not reset payment date filter when onlyUnpaid is set to false", async () => {
      const from = new Date("2026-03-01");
      const to = new Date("2026-03-31");

      const scope = fork({
        values: [
          [$paymentDateFrom, from],
          [$paymentDateTo, to],
          [$onlyUnpaid, true],
        ],
      });

      await allSettled(setOnlyUnpaid, { scope, params: false });

      expect(scope.getState($onlyUnpaid)).toBe(false);
      expect(scope.getState($paymentDateFrom)).toEqual(from);
      expect(scope.getState($paymentDateTo)).toEqual(to);
    });
  });

  describe("presets", () => {
    it("should set correct dates for currentMonth preset", async () => {
      const scope = fork();

      await allSettled(setPaymentDatePreset, { scope, params: "currentMonth" });

      const from = scope.getState($paymentDateFrom);
      const to = scope.getState($paymentDateTo);
      const now = new Date();

      expect(from).not.toBeNull();
      expect(to).not.toBeNull();
      expect(from!.getDate()).toBe(1);
      expect(from!.getMonth()).toBe(now.getMonth());
      expect(from!.getFullYear()).toBe(now.getFullYear());
      expect(to!.getMonth()).toBe(now.getMonth());
      expect(scope.getState($paymentDatePreset)).toBe("currentMonth");
    });

    it("should set correct dates for lastMonth preset", async () => {
      const scope = fork();

      await allSettled(setPaymentDatePreset, { scope, params: "lastMonth" });

      const from = scope.getState($paymentDateFrom);
      const to = scope.getState($paymentDateTo);
      const now = new Date();
      const expectedMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;

      expect(from).not.toBeNull();
      expect(to).not.toBeNull();
      expect(from!.getDate()).toBe(1);
      expect(from!.getMonth()).toBe(expectedMonth);
      expect(scope.getState($paymentDatePreset)).toBe("lastMonth");
    });

    it("should set correct dates for currentWeek preset", async () => {
      const scope = fork();

      await allSettled(setPaymentDatePreset, { scope, params: "currentWeek" });

      const from = scope.getState($paymentDateFrom);
      const to = scope.getState($paymentDateTo);

      expect(from).not.toBeNull();
      expect(to).not.toBeNull();
      // Monday = 1
      expect(from!.getDay()).toBe(1);
      // Sunday = 0
      expect(to!.getDay()).toBe(0);
      expect(scope.getState($paymentDatePreset)).toBe("currentWeek");
    });

    it("should reset preset on manual date change", async () => {
      const scope = fork({
        values: [
          [$paymentDatePreset, "currentMonth" as const],
          [$paymentDateFrom, new Date("2026-03-01")],
          [$paymentDateTo, new Date("2026-03-31")],
        ],
      });

      await allSettled(setPaymentDateFrom, { scope, params: new Date("2026-03-15") });

      expect(scope.getState($paymentDatePreset)).toBeNull();
      expect(scope.getState($paymentDateFrom)).toEqual(new Date("2026-03-15"));
    });

    it("should reset preset when onlyUnpaid is enabled", async () => {
      const scope = fork({
        values: [
          [$paymentDatePreset, "currentWeek" as const],
          [$paymentDateFrom, new Date("2026-03-17")],
          [$paymentDateTo, new Date("2026-03-23")],
        ],
      });

      await allSettled(setOnlyUnpaid, { scope, params: true });

      expect(scope.getState($paymentDatePreset)).toBeNull();
      expect(scope.getState($paymentDateFrom)).toBeNull();
      expect(scope.getState($paymentDateTo)).toBeNull();
    });
  });

  describe("onlyWithoutHomework", () => {
    it("should update on setOnlyWithoutHomework", async () => {
      const scope = fork();

      await allSettled(setOnlyWithoutHomework, { scope, params: true });

      expect(scope.getState($onlyWithoutHomework)).toBe(true);
    });
  });
});
