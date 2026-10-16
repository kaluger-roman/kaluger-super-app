import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { theme } from "@shared";

import { RegisterFormFields } from "../RegisterFormFields";

const renderFields = () =>
  render(
    <ThemeProvider theme={theme}>
      <RegisterFormFields
        formData={{ name: "", email: "", password: "", confirmPassword: "" }}
        setters={{
          setName: vi.fn(),
          setEmail: vi.fn(),
          setPassword: vi.fn(),
          setConfirmPassword: vi.fn(),
        }}
        isMobile={false}
        authError={null}
        onClearValidationError={vi.fn()}
      />
    </ThemeProvider>
  );

describe("RegisterFormFields", () => {
  it("should mask both password fields", () => {
    renderFields();

    expect(screen.getByLabelText(/^Пароль/)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/^Подтвердите пароль/)).toHaveAttribute("type", "password");
  });
});
