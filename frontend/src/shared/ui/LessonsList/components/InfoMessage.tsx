import React from "react";
import { Box, Typography } from "@mui/material";

export const InfoMessage: React.FC = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="100%"
      sx={{ px: 2 }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          fontSize: { xs: "0.75rem", sm: "0.875rem" },
          textAlign: "center",
          whiteSpace: "normal",
          lineHeight: 1.4,
          maxWidth: "100%",
          px: 2,
          py: 1,
          backgroundColor: "rgba(25, 118, 210, 0.08)",
          borderRadius: 1,
          border: "1px solid rgba(25, 118, 210, 0.23)",
        }}
      >
        ℹ️ Регулярные уроки рассчитываются автоматически на три месяца вперед
      </Typography>
    </Box>
  );
};
