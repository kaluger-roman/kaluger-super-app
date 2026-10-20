import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { fork } from "effector";
import { Provider as EffectorProvider } from "effector-react";
import { describe, it, expect } from "vitest";

import { adminDataModel, backupStatusModel } from "@features/admin";
import { theme } from "@shared";

import { BackupSection } from "../BackupSection";

const LIMIT_TEXT = "Лимит превышен: бэкапы младше 30 дней не удаляются. Увеличьте лимит.";

const renderSection = (storageLimitExceeded: boolean) => {
  const scope = fork({
    values: [
      [
        adminDataModel.$backupSettings,
        { enabled: true, intervalHours: 6, maxStorageMb: 10, lastBackupAt: null },
      ],
      [
        adminDataModel.$backupFiles,
        [
          {
            name: "backup-2026-10-16T14-00-00-058Z.sql.gz",
            sizeMb: 14.4,
            createdAt: "2026-10-16T14:00:01Z",
          },
        ],
      ],
      [adminDataModel.$totalSizeMb, 14.4],
      [backupStatusModel.$storageLimitExceeded, storageLimitExceeded],
    ],
  });

  return render(
    <EffectorProvider value={scope}>
      <ThemeProvider theme={theme}>
        <BackupSection />
      </ThemeProvider>
    </EffectorProvider>
  );
};

describe("BackupSection", () => {
  it("should explain that backups younger than the retention floor are kept", () => {
    renderSection(false);

    expect(
      screen.getByText("Бэкапы младше 30 дней не удаляются независимо от лимита размера")
    ).toBeInTheDocument();
  });

  it("should not show the limit warning while the limit holds", () => {
    renderSection(false);

    expect(screen.queryByText(LIMIT_TEXT)).not.toBeInTheDocument();
  });

  it("should show the limit warning under the retention hint, before the file list", () => {
    renderSection(true);

    const hint = screen.getByText(
      "Бэкапы младше 30 дней не удаляются независимо от лимита размера"
    );
    const warning = screen.getByText(LIMIT_TEXT);
    const filesHeading = screen.getByText("Файлы бэкапов");

    expect(hint.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      warning.compareDocumentPosition(filesHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
