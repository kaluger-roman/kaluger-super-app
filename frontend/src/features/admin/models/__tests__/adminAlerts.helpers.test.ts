import { describe, it, expect } from "vitest";

import { makeAlert, READ_AT, RESOLVED } from "./adminAlerts.fixtures";
import {
  countUnreadActiveAlerts,
  getActiveAlerts,
  getResolvedAlerts,
  hasCriticalAlert,
} from "../adminAlerts.helpers";

const unread = makeAlert({ id: "unread" });
const read = makeAlert({ id: "read", readAt: READ_AT });
const resolved = makeAlert({ id: "resolved", ...RESOLVED });
const resolvedUnread = makeAlert({ id: "resolved-unread", ...RESOLVED, readAt: null });

describe("features/admin/models/adminAlerts.helpers", () => {
  it("should keep only active alerts in their order", () => {
    expect(getActiveAlerts([unread, resolved, read])).toEqual([unread, read]);
  });

  it("should keep only resolved alerts in their order", () => {
    expect(getResolvedAlerts([unread, resolved, read, resolvedUnread])).toEqual([
      resolved,
      resolvedUnread,
    ]);
  });

  it("should count only active alerts that are not read", () => {
    expect(countUnreadActiveAlerts([unread, read, resolvedUnread])).toBe(1);
    expect(countUnreadActiveAlerts([])).toBe(0);
  });

  it("should tell whether a list has a critical alert", () => {
    expect(hasCriticalAlert([makeAlert({ severity: "warning" }), unread])).toBe(true);
    expect(hasCriticalAlert([makeAlert({ severity: "warning" })])).toBe(false);
    expect(hasCriticalAlert([])).toBe(false);
  });
});
