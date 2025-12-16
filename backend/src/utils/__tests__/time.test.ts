import { truncateToMinute } from "../time";

describe("truncateToMinute", () => {
  it("should zero seconds and milliseconds", () => {
    const date = new Date("2025-12-17T12:34:56.789Z");
    const res = truncateToMinute(date);
    expect(res.getUTCSeconds()).toBe(0);
    expect(res.getUTCMilliseconds()).toBe(0);
    // Minutes, hours, day should stay the same
    expect(res.getUTCMinutes()).toBe(34);
    expect(res.getUTCHours()).toBe(12);
  });

  it("should not mutate the original date object", () => {
    const original = new Date("2025-12-17T01:02:03.004Z");
    const copy = new Date(original);
    const res = truncateToMinute(original);
    expect(original.getUTCSeconds()).toBe(copy.getUTCSeconds());
    expect(original.getUTCMilliseconds()).toBe(copy.getUTCMilliseconds());
    // result should have seconds zeroed
    expect(res.getUTCSeconds()).toBe(0);
  });
});
