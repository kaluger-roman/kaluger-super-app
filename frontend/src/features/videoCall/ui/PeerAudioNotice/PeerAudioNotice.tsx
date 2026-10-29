import type { FC } from "react";

import { MicOffOutlined as MicSuspendedIcon } from "@mui/icons-material";
import { useUnit } from "effector-react";

import * as Styled from "./PeerAudioNotice.styled";
import { peerViewModel } from "../../model";

// The peer's sound the system suspended (FR-032/FR-033): on the peer's tile, and in fullscreen
// under the top bar.
export const PeerAudioNotice: FC = () => {
  const notice = useUnit(peerViewModel.$peerAudioNotice);
  if (!notice) return null;

  return (
    <Styled.Pill role="status">
      <MicSuspendedIcon fontSize="small" />
      {notice}
    </Styled.Pill>
  );
};
