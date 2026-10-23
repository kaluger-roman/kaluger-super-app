import {
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  VideoCall as VideoCallIcon,
} from "@mui/icons-material";

import type { NavigationItem } from "./StudentSidebar.types";

export const STUDENT_SIDEBAR_ITEMS: NavigationItem[] = [
  {
    label: "Расписание",
    path: "/student/cabinet/schedule",
    icon: <ScheduleIcon />,
  },
  {
    label: "История звонков",
    path: "/student/cabinet/calls",
    icon: <VideoCallIcon />,
  },
  {
    label: "Настройки",
    path: "/student/cabinet/settings",
    icon: <SettingsIcon />,
  },
];
