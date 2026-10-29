import type { FC } from "react";

import { Close as CloseIcon, PhoneIphone as PhoneIcon } from "@mui/icons-material";
import { useUnit } from "effector-react";

import * as Styled from "./BackgroundAudioHint.styled";
import { backgroundHintModel } from "../../model";
import { BACKGROUND_AUDIO_HINT_TEXT } from "../../videoCall.constants";

// FR-012: shown until dismissed, only where the own mic really stops in the background (FR-033).
export const BackgroundAudioHint: FC = () => {
  const isShown = useUnit(backgroundHintModel.$isBackgroundHintShown);
  const { dismissed } = useUnit({ dismissed: backgroundHintModel.backgroundHintDismissed });

  if (!isShown) return null;

  return (
    <Styled.HintBox role="note">
      <PhoneIcon fontSize="small" />
      <Styled.HintText variant="body2">{BACKGROUND_AUDIO_HINT_TEXT}</Styled.HintText>
      <Styled.CloseButton size="small" aria-label="Закрыть подсказку" onClick={() => dismissed()}>
        <CloseIcon fontSize="small" />
      </Styled.CloseButton>
    </Styled.HintBox>
  );
};
