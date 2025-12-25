import type { FC } from "react";

import { Tab, useTheme, useMediaQuery } from "@mui/material";
import { useUnit } from "effector-react";

import { lessonsModel } from "@features";

import { TABS } from "./LessonsTabs.constants";
import * as Styled from "./LessonsTabs.styled";

export const LessonsTabs: FC = () => {
  const theme = useTheme();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const currentTab = useUnit(lessonsModel.$currentTab);

  return (
    <Styled.Container>
      <Styled.StyledTabs
        value={currentTab}
        onChange={(_event, newValue) => lessonsModel.tabChanged(newValue)}
        variant={isSmallMobile ? "scrollable" : "standard"}
        scrollButtons={isSmallMobile ? "auto" : false}
        allowScrollButtonsMobile={isSmallMobile}
        $isSmallMobile={isSmallMobile}
      >
        {TABS.map((tab, index) => (
          <Tab key={index} label={tab} />
        ))}
      </Styled.StyledTabs>
    </Styled.Container>
  );
};
