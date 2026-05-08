import { Tab, useTheme, useMediaQuery } from "@mui/material";
import { useUnit } from "effector-react";

import { PROFILE_TABS } from "./ProfileTabs.constants";
import * as Styled from "./ProfileTabs.styled";
import { profileModel } from "../../models";

export const ProfileTabs = () => {
  const theme = useTheme();
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const activeTab = useUnit(profileModel.$activeTab);

  return (
    <Styled.Container>
      <Styled.StyledTabs
        value={activeTab}
        onChange={(_event, newValue) => profileModel.tabChanged(newValue)}
        variant={isSmallMobile ? "scrollable" : "standard"}
        scrollButtons={isSmallMobile ? "auto" : false}
        allowScrollButtonsMobile={isSmallMobile}
        $isSmallMobile={isSmallMobile}
      >
        {PROFILE_TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Styled.StyledTabs>
    </Styled.Container>
  );
};
