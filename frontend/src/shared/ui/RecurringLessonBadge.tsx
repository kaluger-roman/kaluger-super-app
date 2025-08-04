import React from "react";
import { Chip, Tooltip } from "@mui/material";
import { Repeat as RepeatIcon } from "@mui/icons-material";

type RecurringLessonBadgeProps = {
  size?: "small" | "medium";
  variant?: "chip" | "icon";
};

export const RecurringLessonBadge: React.FC<RecurringLessonBadgeProps> = ({
  size = "small",
  variant = "chip",
}) => {
  if (variant === "icon") {
    return (
      <Tooltip title="Повторяющийся урок">
        <RepeatIcon
          color="primary"
          sx={{ fontSize: size === "small" ? 16 : 20 }}
        />
      </Tooltip>
    );
  }

  return (
    <Chip
      icon={<RepeatIcon />}
      label="Регулярный"
      color="primary"
      variant="outlined"
      size={size}
      sx={{
        height: size === "small" ? 20 : 24,
        fontSize: size === "small" ? "0.7rem" : "0.75rem",
        "& .MuiChip-icon": {
          fontSize: size === "small" ? 12 : 14,
        },
      }}
    />
  );
};
