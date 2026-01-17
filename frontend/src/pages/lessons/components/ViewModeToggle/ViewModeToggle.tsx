import type { FC } from "react";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useUnit } from "effector-react";

import { lessonsModel } from "@features";

export const ViewModeToggle: FC = () => {
  const viewMode = useUnit(lessonsModel.$lessonsViewMode);

  return (
    <ToggleButtonGroup
      value={viewMode}
      exclusive
      onChange={(_e, value) => {
        if (value) lessonsModel.setLessonsViewMode(value);
      }}
      size="small"
      aria-label="view-mode"
    >
      <ToggleButton value="paged" aria-label="paged">
        Постранично
      </ToggleButton>
      <ToggleButton value="schedule" aria-label="schedule">
        Расписание
      </ToggleButton>
      <ToggleButton value="weekly" aria-label="weekly">
        Понедельно
      </ToggleButton>
    </ToggleButtonGroup>
  );
};
