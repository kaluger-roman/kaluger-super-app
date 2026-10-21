import { describe, expect, it } from "vitest";

import { getStatusChipColor } from "../CallHistoryList.helpers";

describe("CallHistoryList helpers", () => {
  it("should map call statuses to chip colors", () => {
    expect(getStatusChipColor("COMPLETED")).toBe("success");
    expect(getStatusChipColor("MISSED")).toBe("warning");
    expect(getStatusChipColor("REJECTED")).toBe("error");
    expect(getStatusChipColor("FAILED")).toBe("error");
    expect(getStatusChipColor("CANCELED")).toBe("default");
  });
});
