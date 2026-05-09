import {
  MAX_VERIFICATION_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  generateVerificationCode,
  getVerificationCodeExpiry,
  isVerificationCodeExpired,
  isWithinResendCooldown,
} from "../verification";

describe("Verification Utils", () => {
  describe("generateVerificationCode", () => {
    it("should generate a 6-digit code", () => {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    });

    it("should generate different codes", () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateVerificationCode());
      }
      expect(codes.size).toBeGreaterThan(50);
    });

    it("should generate codes in range 100000-999999", () => {
      for (let i = 0; i < 10; i++) {
        const code = generateVerificationCode();
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it("should only contain numeric characters", () => {
      const code = generateVerificationCode();
      expect(code).toMatch(/^[0-9]+$/);
    });
  });

  describe("getVerificationCodeExpiry", () => {
    it("should return expiry date 15 minutes in the future", () => {
      const before = new Date();
      const expiry = getVerificationCodeExpiry();
      const after = new Date();

      const expectedMin = new Date(before.getTime() + 14 * 60 * 1000);
      const expectedMax = new Date(after.getTime() + 16 * 60 * 1000);

      expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(expiry.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });

    it("should return a Date object", () => {
      const expiry = getVerificationCodeExpiry();
      expect(expiry).toBeInstanceOf(Date);
    });

    it("should return a future date", () => {
      const now = new Date();
      const expiry = getVerificationCodeExpiry();
      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe("isVerificationCodeExpired", () => {
    it("should return true for past date", () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 20);
      expect(isVerificationCodeExpired(pastDate)).toBe(true);
    });

    it("should return false for future date", () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      expect(isVerificationCodeExpired(futureDate)).toBe(false);
    });

    it("should return true for current moment", () => {
      const now = new Date();
      const almostNow = new Date(now.getTime() - 100);
      expect(isVerificationCodeExpired(almostNow)).toBe(true);
    });

    it("should return true for exactly 15 minutes ago", () => {
      const fifteenMinutesAgo = new Date();
      fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
      expect(isVerificationCodeExpired(fifteenMinutesAgo)).toBe(true);
    });

    it("should return false for 5 minutes in the future", () => {
      const fiveMinutesLater = new Date();
      fiveMinutesLater.setMinutes(fiveMinutesLater.getMinutes() + 5);
      expect(isVerificationCodeExpired(fiveMinutesLater)).toBe(false);
    });

    it("should handle milliseconds precision", () => {
      const now = new Date();
      expect(isVerificationCodeExpired(now)).toBe(false);
      const justPassed = new Date(now.getTime() - 1);
      expect(isVerificationCodeExpired(justPassed)).toBe(true);
    });
  });

  describe("isWithinResendCooldown", () => {
    it("should return false when sentAt is null", () => {
      expect(isWithinResendCooldown(null)).toBe(false);
    });

    it("should return true when sentAt is just now", () => {
      expect(isWithinResendCooldown(new Date())).toBe(true);
    });

    it("should return true when sentAt is within cooldown window", () => {
      const within = new Date(Date.now() - 30 * 1000);
      expect(isWithinResendCooldown(within)).toBe(true);
    });

    it("should return false when sentAt is past cooldown window", () => {
      const past = new Date(Date.now() - (RESEND_COOLDOWN_SECONDS + 1) * 1000);
      expect(isWithinResendCooldown(past)).toBe(false);
    });

    it("should return false at exact cooldown boundary", () => {
      const boundary = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);
      expect(isWithinResendCooldown(boundary)).toBe(false);
    });
  });

  describe("constants", () => {
    it("should expose MAX_VERIFICATION_ATTEMPTS", () => {
      expect(MAX_VERIFICATION_ATTEMPTS).toBe(5);
    });

    it("should expose RESEND_COOLDOWN_SECONDS", () => {
      expect(RESEND_COOLDOWN_SECONDS).toBe(60);
    });
  });
});
