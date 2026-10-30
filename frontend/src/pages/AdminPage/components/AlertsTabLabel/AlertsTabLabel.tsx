import type { FC } from "react";

import { useUnit } from "effector-react";

import { adminAlertsModel } from "@features/admin";

import * as Styled from "./AlertsTabLabel.styled";

export const AlertsTabLabel: FC = () => {
  const unreadCount = useUnit(adminAlertsModel.$unreadActiveAlertsCount);

  return (
    <Styled.StyledLabel>
      Алерты
      {unreadCount > 0 && (
        <Styled.StyledCounter
          label={unreadCount}
          size="small"
          color="error"
          aria-label={`Непрочитанных алертов: ${unreadCount}`}
        />
      )}
    </Styled.StyledLabel>
  );
};
