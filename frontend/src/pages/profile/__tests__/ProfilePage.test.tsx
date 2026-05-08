/* eslint-disable import/order */
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { theme } from "@shared";
import { userModel } from "@entities";

import { ProfilePage } from "../ProfilePage";
import { profileModel } from "../models";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: {
      updateProfile: vi.fn(),
    },
  };
});

const renderWithProviders = (ui: React.ReactElement, scope: ReturnType<typeof fork>) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </EffectorProvider>
  );

describe("ProfilePage", () => {
  const mockUser = {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    createdAt: "2024-01-01T00:00:00Z",
    isEmailVerified: true,
    taxRate: 6,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render page title and tabs", () => {
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$name, mockUser.name],
        [profileModel.$isEditMode, false],
        [profileModel.$error, ""],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    expect(screen.getByText("Настройки")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /мои данные/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /безопасность/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /уведомления/i })).toBeInTheDocument();
  });

  it("should render personal data on default tab", () => {
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$name, mockUser.name],
        [profileModel.$isEditMode, false],
        [profileModel.$error, ""],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("should show edit button when not in edit mode", () => {
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$name, mockUser.name],
        [profileModel.$isEditMode, false],
        [profileModel.$error, ""],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    expect(screen.getByRole("button", { name: /редактировать/i })).toBeInTheDocument();
  });

  it("should show text field when in edit mode", () => {
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$name, "Test User"],
        [profileModel.$isEditMode, true],
        [profileModel.$error, ""],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
  });

  it("should show save and cancel buttons in edit mode", () => {
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$name, "Test User"],
        [profileModel.$isEditMode, true],
        [profileModel.$error, ""],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    expect(screen.getByRole("button", { name: /отмена/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /сохранить/i })).toBeInTheDocument();
  });

  it("should disable save button when no changes", () => {
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$name, "Test User"],
        [profileModel.$taxRateInput, "6"],
        [profileModel.$isEditMode, true],
        [profileModel.$error, ""],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    const saveButton = screen.getByRole("button", { name: /сохранить/i });
    expect(saveButton).toBeDisabled();
  });

  it("should enable save button when name is different from user name", async () => {
    const user = userEvent.setup();
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$name, mockUser.name],
        [profileModel.$isEditMode, true],
        [profileModel.$error, ""],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    const input = screen.getByDisplayValue(mockUser.name);
    await user.clear(input);
    await user.type(input, "Different Name");

    const saveButton = screen.getByRole("button", { name: /сохранить/i });
    expect(saveButton).not.toBeDisabled();
  });

  it("should show error message when error exists", () => {
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$name, ""],
        [profileModel.$isEditMode, true],
        [profileModel.$error, "Имя не может быть пустым"],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    expect(screen.getByText("Имя не может быть пустым")).toBeInTheDocument();
  });

  it("should render security section content when security tab is active", () => {
    const scope = fork({
      values: [
        [userModel.$user, mockUser],
        [profileModel.$activeTab, "security"],
      ],
    });

    renderWithProviders(<ProfilePage />, scope);

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Пароль")).toBeInTheDocument();
  });

  it("should not render when user is null", () => {
    const scope = fork({
      values: [[userModel.$user, null]],
    });

    const { container } = renderWithProviders(<ProfilePage />, scope);

    expect(container.firstChild).toBeNull();
  });
});
