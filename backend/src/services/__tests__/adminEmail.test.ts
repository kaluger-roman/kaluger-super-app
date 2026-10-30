import { clearTestMailbox, findLatestMailFor } from "../../lib/testMailbox";
import { AdminEmailSendError } from "../../utils";
import { sendAdminEmail } from "../email";

type SendAdminEmail = typeof sendAdminEmail;

const LETTER = { to: "admin-email@example.com", subject: "[Критично] Тест", html: "<p>x</p>" };

const loadProductionSender = (send: jest.Mock): SendAdminEmail => {
  let sender: SendAdminEmail | undefined;
  jest.isolateModules(() => {
    jest.doMock("resend", () => ({
      Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sender = (require("../email") as { sendAdminEmail: SendAdminEmail }).sendAdminEmail;
  });
  if (!sender) throw new Error("email module was not loaded");
  return sender;
};

describe("sendAdminEmail", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    clearTestMailbox();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.dontMock("resend");
  });

  it("should record the letter with its html in the test mailbox", async () => {
    await sendAdminEmail(LETTER);

    expect(findLatestMailFor(LETTER.to)).toMatchObject({
      to: LETTER.to,
      subject: LETTER.subject,
      html: LETTER.html,
    });
  });

  describe("outside the test environment", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("should send the letter through Resend", async () => {
      const send = jest.fn().mockResolvedValue({ data: { id: "email-1" }, error: null });

      await loadProductionSender(send)(LETTER);

      expect(send).toHaveBeenCalledWith(expect.objectContaining(LETTER));
    });

    it("should reject with Resend's message when the API answers with an error", async () => {
      const send = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Invalid API key" } });

      const sending = loadProductionSender(send)(LETTER);

      await expect(sending).rejects.toThrow("Invalid API key");
      await expect(sending).rejects.toBeInstanceOf(Error);
      await expect(sending).rejects.toHaveProperty("name", "AdminEmailSendError");
    });

    it("should wrap a network failure into AdminEmailSendError", async () => {
      const send = jest.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.resend.com"));

      const sending = loadProductionSender(send)(LETTER);

      await expect(sending).rejects.toThrow("getaddrinfo ENOTFOUND api.resend.com");
      await expect(sending).rejects.toHaveProperty("name", AdminEmailSendError.name);
    });
  });
});
