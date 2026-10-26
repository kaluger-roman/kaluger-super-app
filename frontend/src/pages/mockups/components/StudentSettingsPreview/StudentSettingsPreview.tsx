import type { FC } from "react";
import { useMemo } from "react";

import { Typography } from "@mui/material";
import { Provider } from "effector-react";

import { CallNotificationsSection, StudentInfoSection, TutorInfoSection } from "@features";

import { createStudentPreviewScope } from "../../CallBackgroundMockupPage.helpers";
import { MockFrame } from "../MockFrame";

// Mirrors StudentSettingsPage over a scope with a signed-in student.
export const StudentSettingsPreview: FC = () => {
  const scope = useMemo(createStudentPreviewScope, []);

  return (
    <Provider value={scope}>
      <MockFrame title="Кабинет ученика">
        <Typography variant="h5" component="h1" fontWeight={600}>
          Настройки
        </Typography>
        <StudentInfoSection />
        <TutorInfoSection />
        <CallNotificationsSection />
      </MockFrame>
    </Provider>
  );
};
