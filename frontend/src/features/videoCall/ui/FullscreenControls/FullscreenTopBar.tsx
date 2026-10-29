import type { FC } from "react";

import { MicOff as MicOffIcon } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { useUnit } from "effector-react";

import { useBarState, useControlsHover } from "./FullscreenControls.hooks";
import * as Styled from "./FullscreenControls.styled";
import { callModel, peerViewModel } from "../../model";
import { formatCallDuration } from "../../videoCall.helpers";
import { FullscreenToggleButton } from "../FullscreenToggleButton";
import { ScreenShareLabel } from "../ScreenShareLabel";

export const FullscreenTopBar: FC = () => {
  const peerName = useUnit(callModel.$activePeerName);
  const durationSeconds = useUnit(callModel.$callDurationSeconds);
  const peerMedia = useUnit(peerViewModel.$shownPeerMedia);
  const audioNotice = useUnit(peerViewModel.$peerAudioNotice);
  const hoverHandlers = useControlsHover();
  const { visible, interactive } = useBarState();

  return (
    <Styled.TopBar
      $visible={visible}
      $interactive={interactive}
      data-bar="top"
      data-visible={visible}
      data-interactive={interactive}
      {...hoverHandlers}
    >
      <Styled.PeerInfo>
        <Styled.NameLine>
          <Tooltip title={peerName}>
            <Styled.PeerName variant="subtitle1" noWrap>
              {peerName}
            </Styled.PeerName>
          </Tooltip>
          {!peerMedia.micOn && !audioNotice && (
            <Styled.MicBadge aria-label="Микрофон выключен">
              <MicOffIcon />
            </Styled.MicBadge>
          )}
        </Styled.NameLine>
        <Styled.MetaLine>
          <Styled.CallTimer variant="body2">{formatCallDuration(durationSeconds)}</Styled.CallTimer>
          {peerMedia.screenSharing && <ScreenShareLabel />}
        </Styled.MetaLine>
      </Styled.PeerInfo>
      <Styled.TopEnd>
        <FullscreenToggleButton placement="overlay" />
      </Styled.TopEnd>
    </Styled.TopBar>
  );
};
