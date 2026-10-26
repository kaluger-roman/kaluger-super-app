import type { FC } from "react";

import { useSearchParams } from "react-router-dom";

import {
  CABINET_STATES,
  CALL_PREVIEWS,
  STUDENT_SETTINGS_STATES,
  TOAST_PREVIEWS,
  TUTOR_SETTINGS_STATE,
} from "./CallBackgroundMockupPage.constants";
import {
  CabinetPreview,
  CallScreenPreview,
  MockupIndex,
  StudentSettingsPreview,
  ToastPreview,
  TutorSettingsPreview,
} from "./components";

// TODO(auto-feature): remove mockup preview route — this page folder and its route in AppRoutes.
export const CallBackgroundMockupPage: FC = () => {
  const [searchParams] = useSearchParams();
  const state = searchParams.get("state") ?? "";
  const callConfig = CALL_PREVIEWS[state];
  const toast = TOAST_PREVIEWS[state];

  if (callConfig) return <CallScreenPreview config={callConfig} />;
  if (toast) return <ToastPreview toast={toast} />;
  if (CABINET_STATES.includes(state)) return <CabinetPreview />;
  if (STUDENT_SETTINGS_STATES.includes(state)) return <StudentSettingsPreview />;
  if (state === TUTOR_SETTINGS_STATE) return <TutorSettingsPreview />;
  return <MockupIndex />;
};
