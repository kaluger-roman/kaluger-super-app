import { useUnit } from "effector-react";

import { callModel, getSession } from "../../model";

type CallStreams = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
};

export const useCallStreams = (): CallStreams => {
  const callId = useUnit(callModel.$callId);
  useUnit(callModel.$mediaEpoch);

  if (!callId) return { localStream: null, remoteStream: null };
  const session = getSession(callId);
  return {
    localStream: session?.localStream ?? null,
    remoteStream: session?.remoteStream ?? null,
  };
};
