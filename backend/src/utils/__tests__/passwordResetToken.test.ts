import {
  RESET_TOKEN_TTL_MINUTES,
  createResetToken,
  getResetTokenExpiry,
  hashResetToken,
  isResetTokenExpired,
} from "../passwordResetToken";

describe("passwordResetToken util", () => {
  describe("createResetToken", () => {
    it("should return non-empty token and matching tokenHash", () => {
      const { token, tokenHash } = createResetToken();
      expect(token.length).toBeGreaterThan(0);
      expect(tokenHash).toBe(hashResetToken(token));
    });

    it("should generate unique tokens across many invocations", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 1000; i += 1) {
        tokens.add(createResetToken().token);
      }
      expect(tokens.size).toBe(1000);
    });

    it("should produce a base64url string without padding or url-unsafe chars", () => {
      const { token } = createResetToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe("hashResetToken", () => {
    it("should be deterministic for the same input", () => {
      const token = "some-test-token";
      expect(hashResetToken(token)).toBe(hashResetToken(token));
    });

    it("should produce a 64-char hex digest", () => {
      const hash = hashResetToken("any-token");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should produce different hashes for different inputs", () => {
      expect(hashResetToken("token-a")).not.toBe(hashResetToken("token-b"));
    });
  });

  describe("getResetTokenExpiry", () => {
    it("should return a date approximately TTL minutes in the future", () => {
      const before = Date.now();
      const expiry = getResetTokenExpiry();
      const expected = before + RESET_TOKEN_TTL_MINUTES * 60 * 1000;
      expect(expiry.getTime()).toBeGreaterThanOrEqual(expected - 1000);
      expect(expiry.getTime()).toBeLessThanOrEqual(expected + 1000);
    });
  });

  describe("isResetTokenExpired", () => {
    it("should return true for past dates", () => {
      const past = new Date(Date.now() - 60_000);
      expect(isResetTokenExpired(past)).toBe(true);
    });

    it("should return false for future dates", () => {
      const future = new Date(Date.now() + 60_000);
      expect(isResetTokenExpired(future)).toBe(false);
    });
  });
});
