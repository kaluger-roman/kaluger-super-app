import {
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

import type { NavigationItem } from "./StudentSidebar.types";

export const STUDENT_SIDEBAR_ITEMS: NavigationItem[] = [
  {
    label: "Расписание",
    path: "/student/cabinet/schedule",
    icon: <ScheduleIcon />,
  },
  {
    label: "Настройки",
    path: "/student/cabinet/settings",
    icon: <SettingsIcon />,
  },
];
