import { createEvent } from "effector";

import type { PeerStateChange } from "./mediaRecovery.types";

// State changes of the call's RTCPeerConnection, as the browser reports them.
export const connectionStateChanged = createEvent<PeerStateChange>();
export const iceStateChanged = createEvent<PeerStateChange>();
