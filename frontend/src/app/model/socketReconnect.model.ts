import { createEffect, createStore, sample } from "effector";
import { delay } from "patronum";

import type { SocketReconnectUnits } from "./socketConnection.types";

// When a closed socket of the tab opens again, and whether it may take the connection from another tab.
// Only the tab holding the connection reconnects on its own, so tabs never race for it.
export const attachSocketReconnect = ({
  config,
  openRequested,
  reconnectRequested,
  disconnect,
  closed,
  tokenRenewed,
  tokenRenewedHere,
  $isEnabled,
  $connection,
  $isConnected,
  $elsewhere,
  $revokedToken,
  $isVisible,
}: SocketReconnectUnits): void => {
  const $isReconnectScheduled = createStore(false);
  // Released while hidden by a holder that is gone (4004): this tab asks for the connection once it
  // is looked at, so it does not beat the visible tab that would restore the call (the loser of
  // that race gets 4000 and «Использовать здесь»).
  const $isReconnectOnShow = createStore(false);
  // patronum `delay` cannot be cancelled. Every connect/disconnect bumps the generation, and a
  // delayed reconnect is honored only while its generation is current — otherwise logout + login
  // inside the delay opens a second socket.
  const $generation = createStore(0);

  const canResumeFx = createEffect(
    (revokedToken: string | null): boolean => config.canResume?.(revokedToken) ?? true
  );

  const isTokenReplacedFx = createEffect(
    (revokedToken: string | null): boolean =>
      revokedToken !== null && config.getToken() !== revokedToken
  );

  sample({
    clock: [openRequested, disconnect],
    source: $generation,
    fn: (generation) => generation + 1,
    target: $generation,
  });
  sample({ clock: [openRequested, disconnect], fn: () => false, target: $isReconnectScheduled });
  sample({ clock: [openRequested, disconnect], fn: () => false, target: $isReconnectOnShow });

  // Close events arriving while a reconnect is already scheduled are collapsed.
  const reconnectScheduled = sample({
    clock: closed,
    source: { isEnabled: $isEnabled, isScheduled: $isReconnectScheduled, generation: $generation },
    filter: ({ isEnabled, isScheduled }, { elsewhere, callEnded }) =>
      isEnabled && !isScheduled && !elsewhere && !callEnded,
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
  sample({ clock: canResumeFx.doneData, filter: Boolean, fn: () => true, target: openRequested });

  // The call that held the connection in another tab is over: ask for the connection at once.
  sample({
    clock: closed,
    source: { isEnabled: $isEnabled, isVisible: $isVisible },
    filter: ({ isEnabled, isVisible }, close) =>
      isEnabled && close.callEnded && (isVisible || !close.holderGone),
    fn: () => true,
    target: openRequested,
  });
  sample({
    clock: closed,
    source: { isEnabled: $isEnabled, isVisible: $isVisible },
    filter: ({ isEnabled, isVisible }, { holderGone }) => isEnabled && holderGone && !isVisible,
    fn: () => true,
    target: $isReconnectOnShow,
  });
  // Still waiting for the call elsewhere: a socket that was not waiting comes back on the way below.
  sample({
    clock: config.resumed,
    source: { isEnabled: $isEnabled, isReconnectOnShow: $isReconnectOnShow, elsewhere: $elsewhere },
    filter: ({ isEnabled, isReconnectOnShow, elsewhere }) =>
      isEnabled && isReconnectOnShow && elsewhere === "call",
    fn: () => true,
    target: openRequested,
  });

  // Coming back to the tab retries; if the holder tab was closed meanwhile, this one takes over.
  sample({
    clock: config.resumed,
    source: { isEnabled: $isEnabled, elsewhere: $elsewhere },
    filter: ({ isEnabled, elsewhere }) => isEnabled && elsewhere === "tab",
    fn: () => true,
    target: openRequested,
  });

  // Coming back to the page or to the network, a dropped socket does not wait for the delay: a
  // call may be waiting to be restored.
  sample({
    clock: [config.resumed, config.online],
    source: { isEnabled: $isEnabled, connection: $connection, elsewhere: $elsewhere },
    filter: ({ isEnabled, connection, elsewhere }) =>
      isEnabled && connection === null && elsewhere === null,
    fn: () => true,
    target: openRequested,
  });

  // Coming back to the page reopens a dropped socket with resume=1, which another device holding
  // the connection refuses: the tapped notification replaces that socket with an explicit one. A
  // registered socket stays; one waiting for a call elsewhere cannot get the connection anyway.
  sample({
    clock: config.openedForCall,
    source: { isEnabled: $isEnabled, isConnected: $isConnected, elsewhere: $elsewhere },
    filter: ({ isEnabled, isConnected, elsewhere }) =>
      isEnabled && !isConnected && elsewhere !== "call",
    fn: () => false,
    target: openRequested,
  });

  // The socket looks open but is dead (it did not answer after the page came back).
  sample({
    clock: reconnectRequested,
    source: { isEnabled: $isEnabled, elsewhere: $elsewhere },
    filter: ({ isEnabled, elsewhere }) => isEnabled && elsewhere === null,
    fn: (_, resume) => resume,
    target: openRequested,
  });

  // A socket revoked after another tab already stored the new token reconnects at once.
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
      isEnabled && ((isScheduled && revokedToken !== null) || elsewhere === "tab"),
    fn: () => true,
    target: openRequested,
  });
  // The tab that changed the password or email takes the connection; the server revoked all sockets.
  sample({
    clock: tokenRenewedHere,
    source: $isEnabled,
    filter: Boolean,
    fn: () => false,
    target: openRequested,
  });
};
