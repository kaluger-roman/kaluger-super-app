import type { FC } from "react";
import { useState } from "react";

import { Close as CloseIcon, PhoneIphone as PhoneIcon } from "@mui/icons-material";

import * as Styled from "./BackgroundAudioHint.styled";
import { BACKGROUND_AUDIO_HINT_TEXT } from "../../videoCall.constants";
import { getCallBackgroundMock } from "../callBackgroundMock.helpers";

// FR-012: shown once, only where the own mic really stops in the background (FR-033).
export const BackgroundAudioHint: FC = () => {
  // TODO(auto-feature): replace mock with callPresenceModel.$isBackgroundHintShown
  const isShown = getCallBackgroundMock().backgroundHintShown;
  // TODO(auto-feature): replace with callPresenceModel.backgroundHintDismissed (remembered per device)
  const [dismissed, setDismissed] = useState(false);

  if (!isShown || dismissed) return null;

  return (
    <Styled.HintBox role="note">
      <PhoneIcon fontSize="small" />
      <Styled.HintText variant="body2">{BACKGROUND_AUDIO_HINT_TEXT}</Styled.HintText>
      <Styled.CloseButton
        size="small"
        aria-label="Закрыть подсказку"
        onClick={() => setDismissed(true)}
      >
        <CloseIcon fontSize="small" />
      </Styled.CloseButton>
    </Styled.HintBox>
  );
};
