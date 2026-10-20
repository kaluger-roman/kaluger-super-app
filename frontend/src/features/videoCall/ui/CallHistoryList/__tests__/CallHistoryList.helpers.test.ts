import { describe, expect, it } from "vitest";

import { getStatusChipColor } from "../CallHistoryList.helpers";

describe("CallHistoryList helpers", () => {
  it("should map call statuses to chip colors", () => {
    expect(getStatusChipColor("completed")).toBe("success");
    expect(getStatusChipColor("missed")).toBe("warning");
    expect(getStatusChipColor("rejected")).toBe("error");
    expect(getStatusChipColor("failed")).toBe("error");
    expect(getStatusChipColor("canceled")).toBe("default");
  });
});
