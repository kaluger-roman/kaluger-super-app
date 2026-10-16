import {
  Dashboard as DashboardIcon,
  School as StudentsIcon,
  Schedule as LessonsIcon,
  Assessment as ReportsIcon,
  Newspaper as NewsIcon,
  Person as PersonIcon,
  VideoCall as VideoCallIcon,
} from "@mui/icons-material";

import type { NavigationItem } from "./Sidebar.types";

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: "Главная",
    path: "/",
    icon: <DashboardIcon />,
  },
  {
    label: "Ученики",
    path: "/students",
    icon: <StudentsIcon />,
  },
  {
    label: "Уроки",
    path: "/lessons",
    icon: <LessonsIcon />,
  },
  {
    label: "Отчеты",
    path: "/reports",
    icon: <ReportsIcon />,
  },
  {
    label: "История звонков",
    path: "/call/history",
    icon: <VideoCallIcon />,
  },
  {
    label: "Новости",
    path: "/news",
    icon: <NewsIcon />,
  },
  {
    label: "Настройки",
    path: "/profile",
    icon: <PersonIcon />,
  },
];
