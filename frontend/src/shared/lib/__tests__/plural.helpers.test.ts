import { describe, it, expect } from "vitest";

import { pluralize } from "../plural.helpers";

const FORMS = ["урок", "урока", "уроков"] as const;

describe("pluralize", () => {
  it.each([
    [0, "0 уроков"],
    [1, "1 урок"],
    [2, "2 урока"],
    [4, "4 урока"],
    [5, "5 уроков"],
    [11, "11 уроков"],
    [12, "12 уроков"],
    [14, "14 уроков"],
    [21, "21 урок"],
    [22, "22 урока"],
    [25, "25 уроков"],
    [111, "111 уроков"],
  ])("should format %i as «%s»", (count, expected) => {
    expect(pluralize(count, FORMS)).toBe(expected);
  });
});
