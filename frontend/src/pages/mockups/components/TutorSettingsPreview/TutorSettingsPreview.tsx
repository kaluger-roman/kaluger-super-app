import type { FC } from "react";
import { useMemo } from "react";

import { Typography } from "@mui/material";
import { Provider } from "effector-react";

import { CallNotificationSettings, ReminderSettings } from "@features";

import { createTutorSettingsScope } from "../../CallBackgroundMockupPage.helpers";
import { MockFrame } from "../MockFrame";

// Mirrors the "Уведомления" tab of ProfilePage with push supported and reminders on.
export const TutorSettingsPreview: FC = () => {
  const scope = useMemo(createTutorSettingsScope, []);

  return (
    <Provider value={scope}>
      <MockFrame title="Репетитор">
        <Typography variant="h4" component="h1" fontWeight={700}>
          Настройки
        </Typography>
        <ReminderSettings />
        <CallNotificationSettings />
      </MockFrame>
    </Provider>
  );
};
