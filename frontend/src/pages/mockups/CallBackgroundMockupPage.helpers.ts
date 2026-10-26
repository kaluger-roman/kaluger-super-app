import { fork } from "effector";
import type { Scope } from "effector";

import { notificationsModel, studentUserModel } from "@entities";
import { callModel, callScreenModel } from "@features";

import {
  MOCK_CALL_DURATION_SECONDS,
  MOCK_REMINDER_SETTINGS,
  MOCK_STUDENT_SESSION,
  PEER_CAMERA_PALETTE,
  SELF_CAMERA_PALETTE,
} from "./CallBackgroundMockupPage.constants";
import type { CallPreviewConfig, MockCameraPalette } from "./CallBackgroundMockupPage.types";

const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;

const drawPerson = (
  context: CanvasRenderingContext2D,
  palette: MockCameraPalette,
  tick: number
) => {
  const width = CAMERA_WIDTH;
  const height = CAMERA_HEIGHT;
  const wall = context.createLinearGradient(0, 0, width, height);
  wall.addColorStop(0, palette.wall[0]);
  wall.addColorStop(1, palette.wall[1]);
  context.fillStyle = wall;
  context.fillRect(0, 0, width, height);

  context.fillStyle = palette.shirt;
  context.beginPath();
  context.ellipse(width / 2, height * 1.04, width * 0.34, height * 0.38, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = palette.skin;
  context.fillRect(width / 2 - width * 0.05, height * 0.5, width * 0.1, height * 0.2);
  context.beginPath();
  context.ellipse(width / 2, height * 0.42, width * 0.12, height * 0.17, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = palette.hair;
  context.beginPath();
  context.ellipse(width / 2, height * 0.33, width * 0.13, height * 0.11, 0, Math.PI, 0);
  context.fill();

  // A changing pixel keeps the canvas stream producing frames.
  context.fillStyle = tick % 2 ? "#000000" : "#010101";
  context.fillRect(0, 0, 1, 1);
};

// A drawn "camera" so the preview tiles show a picture without real devices.
const createMockCameraStream = (palette: MockCameraPalette): MediaStream | null => {
  const canvas = document.createElement("canvas");
  canvas.width = CAMERA_WIDTH;
  canvas.height = CAMERA_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context || typeof canvas.captureStream !== "function") return null;
  let tick = 0;
  drawPerson(context, palette, tick);
  window.setInterval(() => {
    tick += 1;
    drawPerson(context, palette, tick);
  }, 250);
  return canvas.captureStream(4);
};

export const createCallPreviewScope = (config: CallPreviewConfig): Scope =>
  fork({
    values: [
      [callScreenModel.$shownCallPhase, "active"],
      [callModel.$callPhase, "active"],
      [callModel.$callRole, config.role],
      [callModel.$outgoingCallPeer, { name: config.peerName, role: config.peerRole }],
      [callModel.$callDurationSeconds, MOCK_CALL_DURATION_SECONDS],
      [callModel.$selfMediaState, config.selfMedia],
      [callModel.$peerMediaState, config.peerMedia],
      [callModel.$localStream, createMockCameraStream(SELF_CAMERA_PALETTE)],
      [callModel.$remoteStream, createMockCameraStream(PEER_CAMERA_PALETTE)],
      [callModel.$screenShareSupported, config.screenShareSupported],
    ],
  });

export const createStudentPreviewScope = (): Scope =>
  fork({ values: [[studentUserModel.$studentSession, MOCK_STUDENT_SESSION]] });

export const createTutorSettingsScope = (): Scope =>
  fork({
    values: [
      [notificationsModel.$isPushSupported, true],
      [notificationsModel.$pushPermission, "granted"],
      [notificationsModel.$reminderSettings, MOCK_REMINDER_SETTINGS],
    ],
  });
