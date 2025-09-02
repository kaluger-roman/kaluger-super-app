import React from "react";
import { Container, Typography, Box } from "@mui/material";
import { useStore } from "effector-react";
import { $upcomingLessons, $students } from "../../entities";
import { QuickActions, UpcomingLessons, StudentsOverview } from "./components";

export const DashboardPage: React.FC = () => {
  const upcomingLessons = useStore($upcomingLessons);
  const students = useStore($students);

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

      <QuickActions studentsCount={students.length} />
      <UpcomingLessons lessons={upcomingLessons} />
      <StudentsOverview students={students} />
    </Container>
  );
};
