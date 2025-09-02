import React from "react";
import { Box, Typography } from "@mui/material";

type RegisterFormHeaderProps = {
  isMobile: boolean;
};

export const RegisterFormHeader = ({ isMobile }: RegisterFormHeaderProps) => {
  return (
    <Box textAlign="center" mb={isMobile ? 2 : 3}>
      <Typography
        variant={isMobile ? "h4" : "h3"}
        component="h1"
        gutterBottom
        sx={{ fontWeight: 700, color: "primary.main" }}
      >
        🎓
      </Typography>
      <Typography
        variant={isMobile ? "h5" : "h4"}
        component="h2"
        gutterBottom
        sx={{ fontWeight: 600 }}
      >
        Создать аккаунт
      </Typography>
      <Typography
        variant={isMobile ? "body2" : "body1"}
        color="text.secondary"
      >
        Зарегистрируйтесь в Kaluger Tutor
      </Typography>
    </Box>
  );
};
