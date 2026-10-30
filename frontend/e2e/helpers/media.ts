// Chromium gets a synthetic camera and microphone and accepts the permission prompt itself, so a
// run never captures the real devices of the machine. A spec that sets its own launchOptions.args
// replaces the project ones and has to spread this list in.
export const FAKE_MEDIA_ARGS = [
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
];
