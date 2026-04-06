import type { FC } from "react";

import { Tab, useTheme, useMediaQuery } from "@mui/material";
import { useUnit } from "effector-react";

import { lessonsModel } from "@features";

import * as Styled from "./LessonsTabs.styled";

export const LessonsTabs: FC = () => {
  const theme = useTheme();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const currentTab = useUnit(lessonsModel.$currentTab);
  const paymentDateFrom = useUnit(lessonsModel.$paymentDateFrom);
  const paymentDateTo = useUnit(lessonsModel.$paymentDateTo);

  const isPaymentFilterActive = paymentDateFrom !== null || paymentDateTo !== null;
  const visibleTabs = isPaymentFilterActive
    ? lessonsModel.TAB_LABELS
    : lessonsModel.BASE_TAB_LABELS;

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
        {visibleTabs.map((tab, index) => (
          <Tab key={index} label={tab} value={index} />
        ))}
      </Styled.StyledTabs>
    </Styled.Container>
  );
};
