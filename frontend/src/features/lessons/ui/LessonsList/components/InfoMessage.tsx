import type { FC } from "react";

import * as Styled from "./InfoMessage.styled";

export const InfoMessage: FC = () => {
  return (
    <Styled.InfoBox>
      <Styled.InfoText variant="body2">
        ℹ️ Регулярные уроки рассчитываются автоматически на три месяца вперед
      </Styled.InfoText>
    </Styled.InfoBox>
  );
};
