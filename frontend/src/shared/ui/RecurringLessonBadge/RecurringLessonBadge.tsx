import type { FC } from "react";

import { Repeat as RepeatIcon } from "@mui/icons-material";
import { Tooltip } from "@mui/material";

import * as Styled from "./RecurringLessonBadge.styled";

type RecurringLessonBadgeProps = {
  size?: "small" | "medium";
  variant?: "chip" | "icon";
};

export const RecurringLessonBadge: FC<RecurringLessonBadgeProps> = ({
  size = "small",
  variant = "chip",
}) => {
  if (variant === "icon") {
    return (
      <Tooltip title="Повторяющийся урок">
        <Styled.StyledIcon color="primary" $size={size} />
      </Tooltip>
    );
  }

  return (
    <Styled.StyledChip
      icon={<RepeatIcon />}
      label="Регулярный"
      color="primary"
      variant="outlined"
      size={size}
      $size={size}
    />
  );
};
