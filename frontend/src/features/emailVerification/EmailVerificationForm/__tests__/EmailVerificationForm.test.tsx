import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { verificationModel } from "@entities";
import { EMAIL_VERIFICATION_CODE_LENGTH, theme } from "@shared";

import { EmailVerificationForm } from "../EmailVerificationForm";

const renderForm = () => {
  const scope = fork({ values: [[verificationModel.$verificationEmail, "user@example.com"]] });

  return render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <EmailVerificationForm />
      </ThemeProvider>
    </EffectorProvider>
  );
};

describe("EmailVerificationForm", () => {
  it("should give every code digit input an accessible name and the numeric keyboard", () => {
    renderForm();

    for (let digit = 1; digit <= EMAIL_VERIFICATION_CODE_LENGTH; digit += 1) {
      const input = screen.getByRole("textbox", {
        name: `Цифра ${digit} из ${EMAIL_VERIFICATION_CODE_LENGTH}`,
      });

      expect(input).toHaveAttribute("inputmode", "numeric");
    }
  });
});
