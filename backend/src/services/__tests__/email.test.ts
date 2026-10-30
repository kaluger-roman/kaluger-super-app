import { clearTestMailbox, findLatestMailFor } from "../../lib/testMailbox";
import { EmailSendError } from "../../utils";
import { sendAdminEmail } from "../email";

type EmailModule = typeof import("../email");

const TO = "email-service@example.com";
const LETTER = { to: TO, subject: "[Критично] Тест", html: "<p>x</p>" };

const SENDERS: { name: string; send: (email: EmailModule) => Promise<void> }[] = [
  { name: "sendVerificationEmail", send: (email) => email.sendVerificationEmail(TO, "123456") },
  {
    name: "sendEmailChangeVerification",
    send: (email) => email.sendEmailChangeVerification(TO, "123456"),
  },
  {
    name: "sendStudentVerificationEmail",
    send: (email) => email.sendStudentVerificationEmail(TO, "123456"),
  },
  {
    name: "sendPasswordResetEmail",
    send: (email) => email.sendPasswordResetEmail(TO, "https://example.com/reset?token=abc"),
  },
  { name: "sendAdminEmail", send: (email) => email.sendAdminEmail(LETTER) },
];

const loadProductionModule = (send: jest.Mock): EmailModule => {
  let loaded: EmailModule | undefined;
  jest.isolateModules(() => {
    jest.doMock("resend", () => ({
      Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require("../email") as EmailModule;
  });
  if (!loaded) throw new Error("email module was not loaded");
  return loaded;
};

describe("email service", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    clearTestMailbox();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.dontMock("resend");
  });

  it("should record the admin letter with its html in the test mailbox", async () => {
    await sendAdminEmail(LETTER);

    expect(findLatestMailFor(LETTER.to)).toMatchObject(LETTER);
  });

  describe.each(SENDERS)("$name outside the test environment", ({ send: sendWith }) => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("should send the letter through Resend", async () => {
      const send = jest.fn().mockResolvedValue({ data: { id: "email-1" }, error: null });

      await sendWith(loadProductionModule(send));

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: TO }));
    });

    it("should reject with Resend's message when the API answers with an error", async () => {
      const send = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Invalid API key" } });

      const sending = sendWith(loadProductionModule(send));

      await expect(sending).rejects.toThrow("Invalid API key");
      await expect(sending).rejects.toHaveProperty("name", EmailSendError.name);
    });

    it("should wrap a network failure into EmailSendError", async () => {
      const send = jest.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.resend.com"));

      const sending = sendWith(loadProductionModule(send));

      await expect(sending).rejects.toThrow("getaddrinfo ENOTFOUND api.resend.com");
      await expect(sending).rejects.toHaveProperty("name", EmailSendError.name);
    });
  });
});
