import type { ReactElement } from "react";

export type NavigationItem = {
  label: string;
  path: string;
  icon: ReactElement;
};

export type StudentSidebarProps = {
  drawerWidth: number;
  open: boolean;
  onClose: () => void;
};
