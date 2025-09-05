import React from "react";
import { Paper, Typography, Box, Card, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Student } from "../../../shared/types";

type StudentsOverviewProps = {
  students: Student[];
};

export const StudentsOverview = ({ students }: StudentsOverviewProps) => {
  const navigate = useNavigate();

  if (students.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        👥 Ученики
      </Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        {students.slice(0, 3).map((student) => (
          <Card key={student.id} variant="outlined" sx={{ p: 1.5 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {student.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {student.grade ? `${student.grade} класс` : "Класс не указан"}
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography variant="body2">
                  {student.hourlyRate
                    ? `${student.hourlyRate} ₽/час`
                    : "Ставка не указана"}
                </Typography>
              </Box>
            </Box>
          </Card>
        ))}
      </Box>
      <Button
        variant="text"
        onClick={() => navigate("/students")}
        sx={{ mt: 1 }}
      >
        Посмотреть всех учеников
      </Button>
    </Paper>
  );
};
