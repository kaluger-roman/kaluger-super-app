import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { theme } from "@shared";

import { StudentInviteForm } from "../StudentInviteForm";

const renderForm = () =>
  render(
    <EffectorProvider value={fork()}>
      <ThemeProvider theme={theme}>
        <StudentInviteForm />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("StudentInviteForm", () => {
  it("should mask both password fields", () => {
    renderForm();

    expect(screen.getByLabelText(/^Пароль/)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/^Подтверждение пароля/)).toHaveAttribute("type", "password");
  });
});
