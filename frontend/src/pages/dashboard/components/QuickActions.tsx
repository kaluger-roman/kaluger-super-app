import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  School as SchoolIcon,
  Group as GroupIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";

type QuickActionsProps = {
  studentsCount: number;
};

export const QuickActions = ({ studentsCount }: QuickActionsProps) => {
  const navigate = useNavigate();

  return (
    <Box
      display="grid"
      gridTemplateColumns={{ xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }}
      gap={2}
      sx={{ mb: 3 }}
    >
      <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/lessons")}>
        <CardContent sx={{ textAlign: "center", py: 2 }}>
          <SchoolIcon sx={{ fontSize: 32, color: "primary.main", mb: 1 }} />
          <Typography variant="h6" sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
            Уроки
          </Typography>
        </CardContent>
      </Card>
      <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/students")}>
        <CardContent sx={{ textAlign: "center", py: 2 }}>
          <GroupIcon sx={{ fontSize: 32, color: "success.main", mb: 1 }} />
          <Typography variant="h6" sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
            Ученики
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {studentsCount} всего
          </Typography>
        </CardContent>
      </Card>
      <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/reports")}>
        <CardContent sx={{ textAlign: "center", py: 2 }}>
          <CalendarIcon sx={{ fontSize: 32, color: "info.main", mb: 1 }} />
          <Typography variant="h6" sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
            Отчеты
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Статистика
          </Typography>
        </CardContent>
      </Card>
      <Card
        sx={{ cursor: "pointer", bgcolor: "primary.main", color: "white" }}
        onClick={() => navigate("/lessons")}
      >
        <CardContent sx={{ textAlign: "center", py: 2 }}>
          <AddIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6" sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
            Новый урок
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Создать
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
