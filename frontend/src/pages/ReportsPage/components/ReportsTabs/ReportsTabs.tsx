import type { FC } from "react";

import { Tab, useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";

import { REPORTS_TABS, REPORTS_TABS_ID } from "./ReportsTabs.constants";
import { getReportsTabId, getReportsTabPanelId } from "./ReportsTabs.helpers";
import * as Styled from "./ReportsTabs.styled";
import { reportsTabsModel } from "../../model";
import type { ReportsTab } from "../../model";

export const ReportsTabs: FC = () => {
  const theme = useTheme();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const activeTab = useUnit(reportsTabsModel.$activeTab);
  const actions = useUnit({ tabChanged: reportsTabsModel.tabChanged });

  return (
    <Styled.Container id={REPORTS_TABS_ID}>
      <Styled.StyledTabs
        value={activeTab}
        onChange={(_event, newValue: ReportsTab) => actions.tabChanged(newValue)}
        variant={isSmallMobile ? "fullWidth" : "standard"}
        aria-label="Разделы отчётов"
        $isSmallMobile={isSmallMobile}
      >
        {REPORTS_TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            id={getReportsTabId(tab.value)}
            aria-controls={getReportsTabPanelId(tab.value)}
          />
        ))}
      </Styled.StyledTabs>
    </Styled.Container>
  );
};
