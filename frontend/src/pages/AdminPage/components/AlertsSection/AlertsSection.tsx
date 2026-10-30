import type { FC } from "react";

import { DoneAll } from "@mui/icons-material";
import { Button, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useUnit } from "effector-react";

import { adminAlertsModel } from "@features/admin";
import type { AlertsFilter } from "@features/admin";

import * as Styled from "./AlertsSection.styled";
import { AlertsEmptyState, AlertsList } from "./components";

export const AlertsSection: FC = () => {
  const filter = useUnit(adminAlertsModel.$alertsFilter);
  const activeAlerts = useUnit(adminAlertsModel.$activeAlerts);
  const resolvedAlerts = useUnit(adminAlertsModel.$resolvedAlerts);
  const unreadCount = useUnit(adminAlertsModel.$unreadActiveAlertsCount);
  const actions = useUnit({
    changeFilter: adminAlertsModel.alertsFilterChanged,
    markAllRead: adminAlertsModel.allAlertsMarkedRead,
  });

  return (
    <div>
      <Styled.StyledToolbar>
        <ToggleButtonGroup
          value={filter}
          exclusive
          size="small"
          aria-label="Фильтр алертов"
          onChange={(_event, value: AlertsFilter | null) => {
            if (value) actions.changeFilter(value);
          }}
        >
          <ToggleButton value="active">Активные</ToggleButton>
          <ToggleButton value="all">Все</ToggleButton>
        </ToggleButtonGroup>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DoneAll />}
          disabled={unreadCount === 0}
          onClick={() => actions.markAllRead()}
        >
          Отметить все прочитанными
        </Button>
      </Styled.StyledToolbar>

      {activeAlerts.length > 0 ? <AlertsList alerts={activeAlerts} /> : <AlertsEmptyState />}

      {filter === "all" && resolvedAlerts.length > 0 && (
        <>
          <Styled.StyledHistoryTitle variant="subtitle2">
            Закрытые за последние 90 дней
          </Styled.StyledHistoryTitle>
          <AlertsList alerts={resolvedAlerts} />
        </>
      )}
    </div>
  );
};
