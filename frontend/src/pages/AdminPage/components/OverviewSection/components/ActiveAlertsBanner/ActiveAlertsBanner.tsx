import type { FC } from "react";

import { Button } from "@mui/material";
import { useUnit } from "effector-react";

import { ADMIN_TAB, adminAlertsModel, adminDataModel } from "@features/admin";

import * as Styled from "./ActiveAlertsBanner.styled";

export const ActiveAlertsBanner: FC = () => {
  const activeCount = useUnit(adminAlertsModel.$activeAlertsCount);
  const hasCritical = useUnit(adminAlertsModel.$hasActiveCriticalAlerts);
  const actions = useUnit({ changeTab: adminDataModel.tabChanged });

  if (activeCount === 0) return null;

  return (
    <Styled.StyledBanner
      severity={hasCritical ? "error" : "warning"}
      action={
        <Button color="inherit" size="small" onClick={() => actions.changeTab(ADMIN_TAB.alerts)}>
          Открыть алерты
        </Button>
      }
    >
      Есть активные проблемы:&nbsp;{activeCount}
    </Styled.StyledBanner>
  );
};
