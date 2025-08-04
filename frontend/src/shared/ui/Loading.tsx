import React from "react";
import { CircularProgress, Box, Typography } from "@mui/material";

type LoadingProps = {
  message?: string;
  size?: number;
};

export const Loading: React.FC<LoadingProps> = ({
  message = "Загрузка...",
  size = 40,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="200px"
      gap={2}
    >
      <CircularProgress size={size} />
      <Typography variant="body2" color="textSecondary">
        {message}
      </Typography>
    </Box>
  );
};
