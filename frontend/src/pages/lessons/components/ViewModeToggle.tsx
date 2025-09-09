import React from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useStore } from "effector-react";
import { $lessonsViewMode, setLessonsViewMode } from "../model/viewMode";

export const ViewModeToggle: React.FC = () => {
  const viewMode = useStore($lessonsViewMode);

  return (
    <ToggleButtonGroup
      value={viewMode}
      exclusive
      onChange={(_e, value) => {
        if (value) setLessonsViewMode(value);
      }}
      size="small"
      aria-label="view-mode"
    >
      <ToggleButton value="paged" aria-label="paged">
        Постранично
      </ToggleButton>
      <ToggleButton value="weekly" aria-label="weekly">
        Понедельно
      </ToggleButton>
      <ToggleButton value="schedule" aria-label="schedule">
        Расписание
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default ViewModeToggle;
