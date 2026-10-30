import type { FC } from "react";

import { useUnit } from "effector-react";

import { FullscreenBottomBar } from "./FullscreenBottomBar";
import { useControlsFocus } from "./FullscreenControls.hooks";
import * as Styled from "./FullscreenControls.styled";
import { FullscreenTopBar } from "./FullscreenTopBar";
import { callBannerModel, callFullscreenModel, peerViewModel } from "../../model";
import { CALL_CONTROLS_ATTR } from "../../videoCall.constants";
import { CallStatusBanner } from "../CallStatusBanner";
import { PeerAudioNotice } from "../PeerAudioNotice";

// The layer itself lets pointers through to the video; only the bars catch them. The statuses stay
// shown while the bars are hidden, as on the tile.
export const FullscreenControls: FC = () => {
  const visible = useUnit(callFullscreenModel.$controlsVisible);
  const bannerText = useUnit(callBannerModel.$callBannerText);
  const audioNotice = useUnit(peerViewModel.$peerAudioNotice);
  const focusHandlers = useControlsFocus();

  return (
    <Styled.Layer
      data-testid="fullscreen-controls"
      data-visible={visible}
      {...{ [CALL_CONTROLS_ATTR]: true }}
      {...focusHandlers}
    >
      <FullscreenTopBar />
      {audioNotice && (
        <Styled.NoticeSlot>
          <PeerAudioNotice />
        </Styled.NoticeSlot>
      )}
      {bannerText && (
        <Styled.BannerSlot>
          <CallStatusBanner text={bannerText} />
        </Styled.BannerSlot>
      )}
      <FullscreenBottomBar />
    </Styled.Layer>
  );
};
