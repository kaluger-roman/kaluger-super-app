import { useGate, useUnit } from "effector-react";

import { userModel } from "@entities";
import { ReminderSettings, TaxRatePeriodsModal } from "@features";

import { PersonalDataSection, ProfileTabs, SecuritySection } from "./components";
import { profileModel } from "./models";
import * as Styled from "./ProfilePage.styled";

export const ProfilePage = () => {
  useGate(profileModel.ProfilePageGate);

  const user = useUnit(userModel.$user);
  const activeTab = useUnit(profileModel.$activeTab);

  if (!user) return null;

  return (
    <Styled.StyledContainer maxWidth="md">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h4">Настройки</Styled.StyledTitle>
      </Styled.HeaderBox>

      <ProfileTabs />

      {activeTab === "personal" && <PersonalDataSection />}
      {activeTab === "security" && <SecuritySection />}
      {activeTab === "notifications" && <ReminderSettings />}

      <TaxRatePeriodsModal />
    </Styled.StyledContainer>
  );
};
