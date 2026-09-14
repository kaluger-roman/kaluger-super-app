import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";

import { changeEmailModel } from "../../../../models";
import { CODE_LENGTH } from "../../ChangeEmailDialog.constants";
import { VerifyStep } from "../VerifyStep";

const renderVerifyStep = () => {
  const scope = fork({ values: [[changeEmailModel.$newEmail, "new@example.com"]] });

  return render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <VerifyStep />
      </ThemeProvider>
    </EffectorProvider>
  );
};

describe("VerifyStep", () => {
  it("should give every code digit input an accessible name", () => {
    renderVerifyStep();

    for (let digit = 1; digit <= CODE_LENGTH; digit += 1) {
      expect(
        screen.getByRole("textbox", { name: `Цифра ${digit} из ${CODE_LENGTH}` })
      ).toBeInTheDocument();
    }
  });
});
