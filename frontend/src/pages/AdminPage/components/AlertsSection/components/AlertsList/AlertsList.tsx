import type { FC } from "react";

import type { AdminAlert } from "@shared";

import { AlertCard } from "../AlertCard";
import * as Styled from "./AlertsList.styled";

type AlertsListProps = {
  alerts: AdminAlert[];
};

export const AlertsList: FC<AlertsListProps> = ({ alerts }) => (
  <Styled.StyledList>
    {alerts.map((alert) => (
      <AlertCard key={alert.id} alert={alert} />
    ))}
  </Styled.StyledList>
);
