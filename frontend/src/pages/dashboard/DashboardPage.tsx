import React from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Card,
  CardContent,
} from "@mui/material";
import { useStore } from "effector-react";
import { useNavigate } from "react-router-dom";
import {
  School as SchoolIcon,
  Group as GroupIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { $upcomingLessons, $students } from "../../entities";

export const DashboardPage: React.FC = () => {
  const upcomingLessons = useStore($upcomingLessons);
  const students = useStore($students);
  const navigate = useNavigate();

  const formatLessonTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleDateString("ru-RU")} ${start.toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )} - ${end.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box mb={3}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          📊 Главная
        </Typography>
      </Box>

      {/* Быстрые действия */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }}
        gap={2}
        sx={{ mb: 3 }}
      >
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/lessons")}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <SchoolIcon sx={{ fontSize: 32, color: "primary.main", mb: 1 }} />
            <Typography
              variant="h6"
              sx={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              Уроки
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/students")}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <GroupIcon sx={{ fontSize: 32, color: "success.main", mb: 1 }} />
            <Typography
              variant="h6"
              sx={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              Ученики
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {students.length} всего
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/reports")}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <CalendarIcon sx={{ fontSize: 32, color: "info.main", mb: 1 }} />
            <Typography
              variant="h6"
              sx={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
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
            <Typography
              variant="h6"
              sx={{ fontSize: "0.9rem", fontWeight: 600 }}
            >
              Новый урок
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Создать
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Ближайшие уроки */}
      {upcomingLessons.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            📅 Ближайшие уроки
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {upcomingLessons.slice(0, 3).map((lesson) => (
              <Card key={lesson.id} variant="outlined" sx={{ p: 1.5 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {lesson.student?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatLessonTime(lesson.startTime, lesson.endTime)}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {lesson.price ? `${lesson.price} ₽` : "Бесплатно"}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
          <Button
            variant="text"
            onClick={() => navigate("/lessons")}
            sx={{ mt: 1 }}
          >
            Посмотреть все уроки
          </Button>
        </Paper>
      )}

      {/* Последние ученики */}
      {students.length > 0 && (
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
                      {student.grade
                        ? `${student.grade} класс`
                        : "Класс не указан"}
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
      )}
    </Container>
  );
};
