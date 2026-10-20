import type { FC } from "react";

import * as Styled from "./BackupStatusLine.styled";
import type { BackupStatusLineData } from "./BackupStatusLine.types";

type BackupStatusLineProps = {
  line: BackupStatusLineData;
};

export const BackupStatusLine: FC<BackupStatusLineProps> = ({ line }) =>
  line.isWarning ? (
    <Styled.StyledStatusAlert severity="warning">{line.text}</Styled.StyledStatusAlert>
  ) : (
    <Styled.StyledStatusText>{line.text}</Styled.StyledStatusText>
  );
