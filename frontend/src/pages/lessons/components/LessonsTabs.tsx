import React from "react";
import { Box, Tabs, Tab } from "@mui/material";

type LessonsTabsProps = {
  currentTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
};

export const LessonsTabs: React.FC<LessonsTabsProps> = ({
  currentTab,
  onTabChange,
}) => {
  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
      <Tabs value={currentTab} onChange={onTabChange}>
        <Tab label="Запланированные" />
        <Tab label="Прошедшие" />
      </Tabs>
    </Box>
  );
};
