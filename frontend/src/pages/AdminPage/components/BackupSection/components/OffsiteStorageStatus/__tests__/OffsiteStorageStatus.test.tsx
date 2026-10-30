import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { backupStatusModel } from "@features/admin";
import { theme } from "@shared";

import { OffsiteStorageStatus } from "../OffsiteStorageStatus";

const renderWithScope = (scope: ReturnType<typeof fork>) =>
  render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <OffsiteStorageStatus />
      </ThemeProvider>
    </EffectorProvider>
  );

describe("OffsiteStorageStatus", () => {
  it("should show both lines as warnings when nothing has happened yet", () => {
    renderWithScope(fork());

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent("Резервное хранилище: копирование ещё не выполнялось");
    expect(alerts[1]).toHaveTextContent("Проверка восстановления: ещё не выполнялась");
  });

  it("should show a fresh copy and a recent successful check as plain text", () => {
    const now = Date.now();
    const scope = fork({
      values: [
        [backupStatusModel.$offsiteLastSyncAt, new Date(now - 20 * 60 * 1000).toISOString()],
        [
          backupStatusModel.$restoreCheck,
          {
            checkedAt: new Date(now - 9 * 60 * 60 * 1000).toISOString(),
            fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
            status: "success",
            counts: { users: 14, students: 93, lessons: 2431 },
          },
        ],
      ],
    });

    renderWithScope(scope);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/^Резервное хранилище: /)).toBeInTheDocument();
    expect(screen.getByText(/успешно \(14\sпользователей/)).toBeInTheDocument();
  });

  it("should show an error result as a warning", () => {
    const scope = fork({
      values: [
        [backupStatusModel.$offsiteLastSyncAt, new Date().toISOString()],
        [
          backupStatusModel.$restoreCheck,
          {
            checkedAt: new Date().toISOString(),
            fileName: null,
            status: "error",
            error: "таблица lessons пуста",
          },
        ],
      ],
    });

    renderWithScope(scope);

    expect(screen.getByRole("alert")).toHaveTextContent("— ошибка: таблица lessons пуста");
  });

  it("should warn with the thresholds the backend sent", () => {
    const now = Date.now();
    const scope = fork({
      values: [
        [backupStatusModel.$offsiteLastSyncAt, new Date(now - 7 * 60 * 60 * 1000).toISOString()],
        [backupStatusModel.$offsiteSyncStaleHours, 6],
        [
          backupStatusModel.$restoreCheck,
          {
            checkedAt: new Date(now - 13 * 60 * 60 * 1000).toISOString(),
            fileName: "backup-2026-10-16T00-00-01-123Z.sql.gz",
            status: "success",
            counts: { users: 14, students: 93, lessons: 2431 },
          },
        ],
        [backupStatusModel.$restoreCheckStaleHours, 12],
      ],
    });

    renderWithScope(scope);

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent("давно не обновлялось (больше 6 часов)");
    expect(alerts[1]).toHaveTextContent("но это было больше 12 часов назад");
  });
});
