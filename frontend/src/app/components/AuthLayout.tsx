import React from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import type { AuthLayoutProps } from "../types";

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        height: isMobile ? "100vh" : "auto", // Фиксированная высота на мобильных
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.50",
        p: isMobile ? 1 : 3, // Уменьшаем отступы на мобильных
        overflow: isMobile ? "hidden" : "auto", // Убираем прокрутку на мобильных
        position: isMobile ? "fixed" : "static", // Фиксируем на мобильных
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {children}
    </Box>
  );
};
