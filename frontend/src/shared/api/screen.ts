import { createEffect } from "effector";

import { api } from "./base";

type ScreenTokenResponse = {
  token: string;
  uploadUrl: string;
};

type ScreenLatestResponse = {
  hasImage: boolean;
  image: string | null;
  updatedAt: string | null;
};

export const screenApi = {
  getTokenFx: createEffect(async () => {
    const response = await api.get<ScreenTokenResponse>("/screen/token");
    return response.data;
  }),

  getLatestFx: createEffect(async () => {
    const response = await api.get<ScreenLatestResponse>("/screen/latest");
    return response.data;
  }),
};
