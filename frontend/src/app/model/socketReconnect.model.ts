import { createEffect, createStore, sample } from "effector";
import { delay } from "patronum";

import { isPageVisible } from "@shared";

import type { SocketReconnectUnits } from "./socketConnection.types";
import {
  CALL_ELSEWHERE_RETRY_DELAY_MS,
  HIDDEN_TAB_RECONNECT_DELAY_MS,
} from "./webSocket.constants";

// When a closed socket of the tab opens again, and whether it may take the connection from another tab.
export const attachSocketReconnect = ({
  config,
  openRequested,
  disconnect,
  closed,
  tokenRenewed,
  $isEnabled,
  $elsewhere,
  $revokedToken,
}: SocketReconnectUnits): void => {
  // Stores
  const $isReconnectScheduled = createStore(false);
  const $isReconnectDeferred = createStore(false);
  // patronum `delay` cannot be cancelled. Every connect/disconnect bumps the generation, and a
  // delayed step is honored only while its generation is current — otherwise logout + login
  // inside the delay opens a second socket.
  const $generation = createStore(0);

  // Effects
  const canResumeFx = createEffect(
    (revokedToken: string | null): boolean => config.canResume?.(revokedToken) ?? true
  );

  const isTokenReplacedFx = createEffect(
    (revokedToken: string | null): boolean =>
      revokedToken !== null && config.getToken() !== revokedToken
  );

  const isPageVisibleFx = createEffect((): boolean => isPageVisible());

  // Samples
  sample({
    clock: [openRequested, disconnect],
    source: $generation,
    fn: (generation) => generation + 1,
    target: $generation,
  });
  sample({
    clock: [openRequested, disconnect],
    fn: () => false,
    target: [$isReconnectScheduled, $isReconnectDeferred],
  });

  // Close events arriving while a reconnect is already scheduled are collapsed.
  const reconnectScheduled = sample({
    clock: closed,
    source: { isEnabled: $isEnabled, isScheduled: $isReconnectScheduled, generation: $generation },
    filter: ({ isEnabled, isScheduled }, { elsewhere }) => isEnabled && !isScheduled && !elsewhere,
    fn: ({ generation }) => generation,
  });
  sample({ clock: reconnectScheduled, fn: () => true, target: $isReconnectScheduled });

  sample({
    clock: delay({ source: reconnectScheduled, timeout: config.reconnectDelayMs }),
    source: { isEnabled: $isEnabled, generation: $generation, revokedToken: $revokedToken },
    filter: ({ isEnabled, generation }, scheduled) => isEnabled && generation === scheduled,
    fn: ({ revokedToken }) => revokedToken,
    target: canResumeFx,
  });
  sample({
    clock: canResumeFx.doneData,
    filter: Boolean,
    fn: () => undefined,
    target: isPageVisibleFx,
  });
  sample({
    clock: isPageVisibleFx.doneData,
    filter: Boolean,
    fn: () => true,
    target: openRequested,
  });

  // A hidden tab lets the tab in use reconnect first after a server restart, but a lone background
  // tab still comes back online on its own to receive calls.
  const reconnectDeferred = sample({
    clock: isPageVisibleFx.doneData,
    source: $generation,
    filter: (_, visible) => !visible,
  });
  sample({ clock: reconnectDeferred, fn: () => true, target: $isReconnectDeferred });
  sample({
    clock: delay({ source: reconnectDeferred, timeout: HIDDEN_TAB_RECONNECT_DELAY_MS }),
    source: { isDeferred: $isReconnectDeferred, isEnabled: $isEnabled, generation: $generation },
    filter: ({ isDeferred, isEnabled, generation }, deferred) =>
      isDeferred && isEnabled && generation === deferred,
    fn: () => true,
    target: openRequested,
  });

  // Coming back to the tab retries at once; if the holder tab was closed meanwhile, this one takes over.
  sample({
    clock: config.resumed,
    source: { isDeferred: $isReconnectDeferred, isEnabled: $isEnabled, elsewhere: $elsewhere },
    filter: ({ isDeferred, isEnabled, elsewhere }) =>
      isEnabled && (isDeferred || elsewhere !== null),
    fn: () => true,
    target: openRequested,
  });

  // While another tab is in a call, keep asking: once it ends, the refusal turns into "tab" and
  // this tab may take the connection over.
  const callElsewhere = sample({
    clock: closed,
    source: { isEnabled: $isEnabled, generation: $generation },
    filter: ({ isEnabled }, { elsewhere }) => isEnabled && elsewhere === "call",
    fn: ({ generation }) => generation,
  });
  sample({
    clock: delay({ source: callElsewhere, timeout: CALL_ELSEWHERE_RETRY_DELAY_MS }),
    source: { isEnabled: $isEnabled, elsewhere: $elsewhere, generation: $generation },
    filter: ({ isEnabled, elsewhere, generation }, scheduled) =>
      isEnabled && elsewhere === "call" && generation === scheduled,
    fn: () => true,
    target: openRequested,
  });

  // A socket revoked by this tab's own token change reconnects at once instead of after the delay.
  sample({
    clock: closed,
    filter: ({ revokedToken }) => revokedToken !== null,
    fn: ({ revokedToken }) => revokedToken,
    target: isTokenReplacedFx,
  });
  sample({
    clock: isTokenReplacedFx.doneData,
    filter: Boolean,
    fn: () => undefined,
    target: tokenRenewed,
  });
  // A new token also retries a tab held elsewhere: the holder may have been logged out by it.
  sample({
    clock: tokenRenewed,
    source: {
      isEnabled: $isEnabled,
      isScheduled: $isReconnectScheduled,
      revokedToken: $revokedToken,
      elsewhere: $elsewhere,
    },
    filter: ({ isEnabled, isScheduled, revokedToken, elsewhere }) =>
      isEnabled && ((isScheduled && revokedToken !== null) || elsewhere !== null),
    fn: () => true,
    target: openRequested,
  });
};
