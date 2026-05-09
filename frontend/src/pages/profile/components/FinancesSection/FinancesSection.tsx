import { Button, FormControlLabel, Switch } from "@mui/material";
import { useUnit } from "effector-react";

import { userModel } from "@entities";
import { TaxRatePeriodsList, taxRatePeriodsModalModel } from "@features";

import * as Styled from "./FinancesSection.styled";
import { financesModel } from "../../models";

export const FinancesSection = () => {
  const user = useUnit(userModel.$user);

  const actions = useUnit({
    toggle: financesModel.taxEnabledRequested,
    openModal: taxRatePeriodsModalModel.modalOpened,
  });

  if (!user) return null;

  return (
    <Styled.SectionPaper elevation={0}>
      <Styled.InfoSection>
        <Styled.InfoLabel variant="body2">Учитывать налог</Styled.InfoLabel>
        <Styled.ToggleRow>
          <FormControlLabel
            control={
              <Switch
                checked={user.taxEnabled}
                onChange={(e) => actions.toggle(e.target.checked)}
              />
            }
            label={user.taxEnabled ? "включено" : "выключено"}
          />
        </Styled.ToggleRow>
        <Styled.Description variant="body2">
          Налог рассчитывается по дате оплаты урока и применяемой ставке периода.
          Если выключить — налог нигде в системе не отображается.
        </Styled.Description>
      </Styled.InfoSection>

      <Styled.InfoSection>
        <Styled.InfoLabel variant="body2">Налоговые ставки</Styled.InfoLabel>
        <TaxRatePeriodsList />
        <Styled.ButtonRow>
          <Button
            variant="outlined"
            size="small"
            onClick={() => actions.openModal()}
          >
            Настроить ставки
          </Button>
        </Styled.ButtonRow>
      </Styled.InfoSection>
    </Styled.SectionPaper>
  );
};
