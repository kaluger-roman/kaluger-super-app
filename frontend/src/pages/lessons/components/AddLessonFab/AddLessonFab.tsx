import type { FC } from "react";

import { Add as AddIcon } from "@mui/icons-material";

import * as Styled from "./AddLessonFab.styled";

type AddLessonFabProps = {
  onClick: () => void;
};

export const AddLessonFab: FC<AddLessonFabProps> = ({ onClick }) => {
  return (
    <Styled.StyledFab color="primary" aria-label="Создать урок" onClick={onClick}>
      <AddIcon />
    </Styled.StyledFab>
  );
};
