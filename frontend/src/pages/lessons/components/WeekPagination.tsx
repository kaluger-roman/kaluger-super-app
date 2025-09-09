import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { formatWeekRange } from "../../../shared/ui/LessonsList/utils";
import { goToNextWeek, goToPrevWeek } from "../model/viewMode";

type WeekPaginationProps = {
  currentWeek: Date;
};

export const WeekPagination: React.FC<WeekPaginationProps> = ({
  currentWeek,
}) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={2}
      mt={3}
    >
      <IconButton onClick={() => goToPrevWeek()} size="small">
        <ChevronLeft />
      </IconButton>

      <Typography
        variant="body1"
        sx={{ minWidth: "120px", textAlign: "center" }}
      >
        {formatWeekRange(currentWeek)}
      </Typography>

      <IconButton onClick={() => goToNextWeek()} size="small">
        <ChevronRight />
      </IconButton>
    </Box>
  );
};
