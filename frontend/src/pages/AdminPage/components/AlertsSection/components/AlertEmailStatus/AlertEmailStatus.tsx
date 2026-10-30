import type { FC } from "react";

import type { AdminAlert } from "@shared";

import { getEmailStatusLines } from "./AlertEmailStatus.helpers";
import * as Styled from "./AlertEmailStatus.styled";

type AlertEmailStatusProps = {
  alert: AdminAlert;
};

export const AlertEmailStatus: FC<AlertEmailStatusProps> = ({ alert }) => (
  <>
    {getEmailStatusLines(alert).map((line) => (
      <Styled.StyledLine key={line.kind} $isError={line.isError}>
        <Styled.StyledIcon />
        <span>{line.text}</span>
      </Styled.StyledLine>
    ))}
  </>
);
