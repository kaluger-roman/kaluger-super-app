import { describe, expect, it } from "vitest";

import { getStatusChipColor } from "../CallHistoryList.helpers";

describe("CallHistoryList helpers", () => {
  it("should map call statuses to chip colors", () => {
    expect(getStatusChipColor("COMPLETED", "incoming")).toBe("success");
    expect(getStatusChipColor("MISSED", "incoming")).toBe("warning");
    expect(getStatusChipColor("REJECTED", "incoming")).toBe("error");
    expect(getStatusChipColor("FAILED", "incoming")).toBe("error");
    expect(getStatusChipColor("CANCELED", "incoming")).toBe("default");
  });

  it("should not flag a call the user made and nobody answered", () => {
    expect(getStatusChipColor("MISSED", "outgoing")).toBe("default");
  });
});
