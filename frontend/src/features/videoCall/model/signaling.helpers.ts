import * as callModel from "./call.model";
import * as negotiationModel from "./negotiation.model";
import { rememberIceServers } from "./peerConnection.helpers";
import { CALL_SIGNAL_OUTBOUND_TYPES } from "./signaling.constants";
import type { CallSignalingInbound, CallSignalingOutbound } from "./signaling.types";
import { sendOverTransport } from "./transport.helpers";

export const sendCallSignal = (message: CallSignalingInbound): void => {
  sendOverTransport(message);
};

export const isCallSignalOutbound = (value: unknown): value is CallSignalingOutbound["type"] =>
  typeof value === "string" && (CALL_SIGNAL_OUTBOUND_TYPES as readonly string[]).includes(value);

export const dispatchCallSignal = (message: CallSignalingOutbound): void => {
  switch (message.type) {
    case "call_incoming":
      rememberIceServers(message.callId, message.iceServers);
      callModel.incomingCallReceived({
        callId: message.callId,
        callerName: message.callerName,
      });
      return;
    case "call_ringing":
      callModel.callRinging({ callId: message.callId, iceServers: message.iceServers });
      return;
    case "call_accepted":
      void negotiationModel.callAcceptedReceivedFx({
        callId: message.callId,
        iceServers: message.iceServers,
      });
      return;
    case "call_rejected":
      callModel.rejectedReceived();
      return;
    case "call_canceled":
      callModel.canceledReceived();
      return;
    case "call_ended":
      callModel.callEnded();
      return;
    case "call_unavailable":
      callModel.unavailableReceived();
      return;
    case "call_busy":
      callModel.busyReceived();
      return;
    case "call_no_answer":
      callModel.noAnswerReceived();
      return;
    case "call_error":
      callModel.callErrorReceived(message.message);
      return;
    case "webrtc_offer":
      void negotiationModel.offerReceivedFx({ callId: message.callId, sdp: message.sdp });
      return;
    case "webrtc_answer":
      void negotiationModel.answerReceivedFx({ callId: message.callId, sdp: message.sdp });
      return;
    case "webrtc_ice":
      void negotiationModel.iceReceivedFx({
        callId: message.callId,
        candidate: message.candidate,
      });
      return;
    case "call_media_state":
      callModel.peerMediaStateChanged({
        micOn: message.micOn,
        cameraOn: message.cameraOn,
        screenSharing: message.screenSharing,
      });
      return;
  }
};
