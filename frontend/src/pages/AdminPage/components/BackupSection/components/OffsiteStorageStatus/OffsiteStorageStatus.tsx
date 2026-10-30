import type { FC } from "react";

import { useUnit } from "effector-react";

import { backupStatusModel } from "@features/admin";

import { BackupStatusLine } from "../BackupStatusLine";
import { getOffsiteSyncLine, getRestoreCheckLine } from "./OffsiteStorageStatus.helpers";
import * as Styled from "./OffsiteStorageStatus.styled";

export const OffsiteStorageStatus: FC = () => {
  const lastSyncAt = useUnit(backupStatusModel.$offsiteLastSyncAt);
  const restoreCheck = useUnit(backupStatusModel.$restoreCheck);
  const syncStaleHours = useUnit(backupStatusModel.$offsiteSyncStaleHours);
  const restoreCheckStaleHours = useUnit(backupStatusModel.$restoreCheckStaleHours);
  const now = Date.now();

  return (
    <Styled.StyledStatusList>
      <BackupStatusLine line={getOffsiteSyncLine(lastSyncAt, syncStaleHours, now)} />
      <BackupStatusLine line={getRestoreCheckLine(restoreCheck, restoreCheckStaleHours, now)} />
    </Styled.StyledStatusList>
  );
};
