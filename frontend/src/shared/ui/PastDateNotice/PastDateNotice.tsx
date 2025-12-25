import type { FC } from "react";
import { useMemo } from "react";

import { shouldShowNotice } from "./PastDateNotice.helpers";
import * as Styled from "./PastDateNotice.styled";
import type { Lesson } from "../../types";

type Props = {
  startTime: Date;
  endTime: Date;
  lesson?: Lesson;
};

export const PastDateNotice: FC<Props> = ({ startTime, endTime, lesson }) => {
  const { visible, message } = useMemo(
    () => shouldShowNotice(startTime, endTime, lesson),
    [startTime, endTime, lesson]
  );

  if (!visible || !message) {
    return null;
  }

  return <Styled.StyledAlert severity="warning">{message}</Styled.StyledAlert>;
};
