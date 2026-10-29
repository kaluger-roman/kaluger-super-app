import type { RefCallback } from "react";
import { useCallback } from "react";

import { useUnit } from "effector-react";

import { peerAudioModel } from "../../model";

// Hands the <audio> to the model, which puts the peer's voice on it and keeps it playing.
export const usePeerAudioRef = (): RefCallback<HTMLAudioElement> => {
  const { elementChanged } = useUnit({ elementChanged: peerAudioModel.peerAudioElementChanged });
  return useCallback(
    (element: HTMLAudioElement | null) => {
      elementChanged(element);
    },
    [elementChanged]
  );
};
