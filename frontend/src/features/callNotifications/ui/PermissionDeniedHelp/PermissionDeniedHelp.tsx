import type { FC } from "react";

import * as Styled from "./PermissionDeniedHelp.styled";
import { DENIED_STEPS, DENIED_TEXT } from "../../callNotifications.constants";

// The system dialog is not offered again after a refusal (US4-3): only the way to allow by hand.
export const PermissionDeniedHelp: FC = () => (
  <Styled.Root>
    <Styled.Text variant="body2">{DENIED_TEXT}</Styled.Text>
    <Styled.StepList>
      {DENIED_STEPS.map((step) => (
        <Styled.Step key={step}>{step}</Styled.Step>
      ))}
    </Styled.StepList>
  </Styled.Root>
);
