import type { FC } from "react";

import { TextField, Typography, Box } from "@mui/material";
import { useUnit } from "effector-react";

import { userModel } from "@entities";

import { changeEmailModel } from "../../../models";

export const InitiateStep: FC = () => {
  const user = useUnit(userModel.$user);
  const newEmail = useUnit(changeEmailModel.$newEmail);
  const password = useUnit(changeEmailModel.$password);

  const actions = useUnit({
    newEmailChanged: changeEmailModel.newEmailChanged,
    passwordChanged: changeEmailModel.passwordChanged,
  });

  if (!user) return null;

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Typography variant="body2" color="text.secondary">
        Текущий email: <strong>{user.email}</strong>
      </Typography>
      <TextField
        fullWidth
        type="email"
        label="Новый email"
        value={newEmail}
        onChange={(e) => actions.newEmailChanged(e.target.value)}
      />
      <TextField
        fullWidth
        type="password"
        label="Текущий пароль"
        value={password}
        onChange={(e) => actions.passwordChanged(e.target.value)}
        helperText="Введите пароль для подтверждения"
      />
    </Box>
  );
};
