import { allSettled, fork } from "effector";
import { describe, it, expect } from "vitest";

import { lessonListLoadHandlers } from "@entities/lesson/testSeams.helpers";

import {
  setPaymentDateFrom,
  setPaymentDateTo,
  resetPaymentDateFilter,
  $paymentDateFrom,
  $paymentDateTo,
} from "../lessonsFilters.model";
import { ALL_TAB_INDEX } from "../lessonsTabs.constants";
import { $currentTab, tabChanged } from "../lessonsTabs.model";

describe("lessonsTabs.model", () => {
  describe("tabChanged", () => {
    it("should update $currentTab", async () => {
      const scope = fork({ handlers: [...lessonListLoadHandlers()] });

      await allSettled(tabChanged, { scope, params: 2 });

      expect(scope.getState($currentTab)).toBe(2);
    });
  });

  describe("auto-select Все tab on payment filter activation", () => {
    it("should switch to Все tab when paymentDateFrom is set", async () => {
      const scope = fork({ handlers: [...lessonListLoadHandlers()] });

      await allSettled(setPaymentDateFrom, {
        scope,
        params: new Date("2026-03-01"),
      });

      expect(scope.getState($currentTab)).toBe(ALL_TAB_INDEX);
    });

    it("should switch to Все tab when paymentDateTo is set", async () => {
      const scope = fork({ handlers: [...lessonListLoadHandlers()] });

      await allSettled(setPaymentDateTo, {
        scope,
        params: new Date("2026-03-31"),
      });

      expect(scope.getState($currentTab)).toBe(ALL_TAB_INDEX);
    });

    it("should reset to tab 0 when filter is cleared while on Все tab", async () => {
      const scope = fork({
        handlers: [...lessonListLoadHandlers()],
        values: [
          [$currentTab, ALL_TAB_INDEX],
          [$paymentDateFrom, new Date("2026-03-01")],
          [$paymentDateTo, new Date("2026-03-31")],
        ],
      });

      await allSettled(resetPaymentDateFilter, { scope });

      expect(scope.getState($currentTab)).toBe(0);
    });

    it("should keep current tab when filter is cleared while on another tab", async () => {
      const scope = fork({
        handlers: [...lessonListLoadHandlers()],
        values: [
          [$currentTab, 1],
          [$paymentDateFrom, new Date("2026-03-01")],
          [$paymentDateTo, new Date("2026-03-31")],
        ],
      });

      await allSettled(resetPaymentDateFilter, { scope });

      expect(scope.getState($currentTab)).toBe(1);
    });
  });
});
