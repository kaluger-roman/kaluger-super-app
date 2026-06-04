import {
  busyReceived,
  callEnded,
  callErrorReceived,
  callRinging,
  incomingCallReceived,
  noAnswerReceived,
  peerMediaStateChanged,
  rejectedReceived,
  unavailableReceived,
} from "./call.model";
import {
  acceptIceServersForCallee,
  answerReceived,
  callAcceptedReceived,
  iceReceived,
  offerReceived,
} from "./negotiation";
import type { CallSignalingInbound, CallSignalingOutbound } from "./signaling.types";
import { sendOverTransport } from "./transport";

export const sendCallSignal = (message: CallSignalingInbound): void => {
  sendOverTransport(message);
};

export const dispatchCallSignal = (message: CallSignalingOutbound): void => {
  switch (message.type) {
    case "call_incoming":
      acceptIceServersForCallee(message.callId, message.iceServers);
      incomingCallReceived({
        callId: message.callId,
        callerName: message.callerName,
      });
      return;
    case "call_ringing":
      callRinging({ callId: message.callId, iceServers: message.iceServers });
      return;
    case "call_accepted":
      void callAcceptedReceived({
        callId: message.callId,
        iceServers: message.iceServers,
      });
      return;
    case "call_rejected":
      rejectedReceived();
      return;
    case "call_canceled":
      callEnded();
      return;
    case "call_ended":
      callEnded();
      return;
    case "call_unavailable":
      unavailableReceived();
      return;
    case "call_busy":
      busyReceived();
      return;
    case "call_no_answer":
      noAnswerReceived();
      return;
    case "call_error":
      callErrorReceived(message.message);
      return;
    case "webrtc_offer":
      void offerReceived({ callId: message.callId, sdp: message.sdp });
      return;
    case "webrtc_answer":
      void answerReceived({ callId: message.callId, sdp: message.sdp });
      return;
    case "webrtc_ice":
      void iceReceived({ callId: message.callId, candidate: message.candidate });
      return;
    case "call_media_state":
      peerMediaStateChanged({
        micOn: message.micOn,
        cameraOn: message.cameraOn,
        screenSharing: message.screenSharing,
      });
      return;
  }
};
