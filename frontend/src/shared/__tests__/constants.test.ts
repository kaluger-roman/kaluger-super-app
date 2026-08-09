import { describe, it, expect } from "vitest";

import { CONTACT_METHOD_LABELS } from "../constants";

describe("CONTACT_METHOD_LABELS", () => {
  it("should contain labels for all contact methods", () => {
    expect(CONTACT_METHOD_LABELS).toEqual({
      WHATSAPP: "WhatsApp",
      TELEGRAM: "Telegram",
      MAX: "MAX",
    });
  });
});
