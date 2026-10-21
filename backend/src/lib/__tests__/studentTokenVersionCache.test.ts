import {
  getCachedStudentTokenVersion,
  setCachedStudentTokenVersion,
} from "../studentTokenVersionCache";

describe("studentTokenVersionCache", () => {
  it("should keep the newer version when an older lookup caches its result later", () => {
    setCachedStudentTokenVersion("student-1", 5);

    setCachedStudentTokenVersion("student-1", 4);

    expect(getCachedStudentTokenVersion("student-1")).toBe(5);
  });

  it("should move the cached version forward", () => {
    setCachedStudentTokenVersion("student-1", 4);

    setCachedStudentTokenVersion("student-1", 5);

    expect(getCachedStudentTokenVersion("student-1")).toBe(5);
  });
});
