import type { ProfileTab } from "../../models";

export const PROFILE_TABS: { value: ProfileTab; label: string }[] = [
  { value: "personal", label: "Мои данные" },
  { value: "security", label: "Безопасность" },
  { value: "notifications", label: "Уведомления" },
];
