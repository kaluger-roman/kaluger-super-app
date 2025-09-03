import React from "react";
import { Box, Tabs, Tab, useTheme, useMediaQuery } from "@mui/material";

type LessonsTabsProps = {
  currentTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
};

const tabs: string[] = ["Запланированные", "Прошедшие", "Отмененные"];

export const LessonsTabs: React.FC<LessonsTabsProps> = ({
  currentTab,
  onTabChange,
}) => {
  const theme = useTheme();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
      <Tabs
        value={currentTab}
        onChange={onTabChange}
        variant={isSmallMobile ? "scrollable" : "standard"}
        scrollButtons={isSmallMobile ? "auto" : false}
        allowScrollButtonsMobile={isSmallMobile}
        sx={{
          "& .MuiTab-root": {
            minWidth: isSmallMobile ? "auto" : 120,
            fontSize: isSmallMobile ? "0.75rem" : "0.875rem",
            padding: isSmallMobile ? "8px 12px" : "12px 16px",
          },
          // Ensure scroll arrow buttons (when rendered) look disabled/grey at scroll limits
          "& .MuiTabs-scrollButtons": {
            // use currentColor for the icon SVGs; set a neutral color for visible buttons
            color: theme.palette.action.active,
            // keep full opacity for enabled buttons
            opacity: 1,
          },
          "& .MuiTabs-scrollButtons.Mui-disabled": {
            // clearly greyed-out disabled state
            color: theme.palette.grey[400],
            // avoid the lowered opacity that may make buttons invisible on some backgrounds
            opacity: 1,
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab} />
        ))}
      </Tabs>
    </Box>
  );
};
