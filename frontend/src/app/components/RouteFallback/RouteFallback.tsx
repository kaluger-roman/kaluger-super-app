import type { FC } from "react";

import { useGate } from "effector-react";

import { blockingModel } from "../../model";

// Renders nothing itself — mounting it raises RouteChunkGate, and the single
// blocking overlay in App covers the chunk load (a second Backdrop here
// stacked dim layers when a request ran while a chunk was loading).
export const RouteFallback: FC = () => {
  useGate(blockingModel.RouteChunkGate);

  return null;
};
