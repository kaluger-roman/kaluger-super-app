import type { FC } from "react";

import { CheckCircleOutline, Done } from "@mui/icons-material";
import { Button, Chip } from "@mui/material";
import { useUnit } from "effector-react";

import { adminAlertsModel } from "@features/admin";
import { formatDateTimeFull } from "@shared";
import type { AdminAlert } from "@shared";

import { AlertEmailStatus } from "../AlertEmailStatus";
import { SEVERITY_CHIP_COLORS, SEVERITY_ICONS, SEVERITY_LABELS } from "./AlertCard.constants";
import { formatLastSeen } from "./AlertCard.helpers";
import * as Styled from "./AlertCard.styled";

type AlertCardProps = {
  alert: AdminAlert;
};

export const AlertCard: FC<AlertCardProps> = ({ alert }) => {
  const isResolved = Boolean(alert.resolvedAt);
  const isMuted = isResolved || Boolean(alert.readAt);
  const actions = useUnit({ markRead: adminAlertsModel.alertMarkedRead });

  return (
    <Styled.StyledCard
      elevation={0}
      $severity={alert.severity}
      $isMuted={isMuted}
      data-muted={isMuted}
    >
      <Styled.StyledHeader>
        <Styled.StyledChips>
          <Chip
            size="small"
            icon={SEVERITY_ICONS[alert.severity]}
            label={SEVERITY_LABELS[alert.severity]}
            color={SEVERITY_CHIP_COLORS[alert.severity]}
            variant={isMuted ? "outlined" : "filled"}
          />
          {isResolved && (
            <Chip
              size="small"
              icon={<CheckCircleOutline />}
              label="Решено"
              color="success"
              variant="outlined"
            />
          )}
        </Styled.StyledChips>
        {!isMuted && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<Done />}
            aria-label={`Прочитано: ${alert.title}`}
            onClick={() => actions.markRead(alert.id)}
          >
            Прочитано
          </Button>
        )}
      </Styled.StyledHeader>

      <Styled.StyledTitle $isMuted={isMuted}>{alert.title}</Styled.StyledTitle>
      <Styled.StyledDescription>{alert.description}</Styled.StyledDescription>

      <Styled.StyledMeta>
        <span>Началось: {formatDateTimeFull(alert.openedAt)}</span>
        <span>Последний раз: {formatLastSeen(alert)}</span>
        {alert.resolvedAt && <span>Закрыт: {formatDateTimeFull(alert.resolvedAt)}</span>}
        <AlertEmailStatus alert={alert} />
      </Styled.StyledMeta>
    </Styled.StyledCard>
  );
};
