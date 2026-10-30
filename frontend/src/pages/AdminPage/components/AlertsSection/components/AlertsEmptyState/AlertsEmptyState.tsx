import type { FC } from "react";

import * as Styled from "./AlertsEmptyState.styled";

export const AlertsEmptyState: FC = () => (
  <Styled.StyledEmpty>
    <Styled.StyledIcon />
    <Styled.StyledText>Всё в порядке, активных алертов нет</Styled.StyledText>
  </Styled.StyledEmpty>
);
