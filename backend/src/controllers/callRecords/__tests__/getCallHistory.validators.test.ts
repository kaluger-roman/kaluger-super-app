import { parseHistoryQuery } from "../getCallHistory.validators";

describe("parseHistoryQuery", () => {
  it("should parse a numeric limit", () => {
    expect(parseHistoryQuery({ limit: "20" })).toEqual({ limit: 20 });
  });

  it("should drop the limit when it is not a number", () => {
    expect(parseHistoryQuery({ limit: "abc" })).toEqual({ limit: undefined });
  });

  it("should drop the limit when it is missing or repeated", () => {
    expect(parseHistoryQuery({})).toEqual({ limit: undefined });
    expect(parseHistoryQuery({ limit: ["10", "20"] })).toEqual({ limit: undefined });
  });
});
