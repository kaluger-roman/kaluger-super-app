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

let previousBlobUrl: string | null = null;

export const screenApi = {
  getTokenFx: createEffect(async () => {
    const response = await api.get<ScreenTokenResponse>("/screen/token");
    return response.data;
  }),

  getLatestFx: createEffect(async (): Promise<ScreenLatestResponse> => {
    if (previousBlobUrl) {
      URL.revokeObjectURL(previousBlobUrl);
      previousBlobUrl = null;
    }

    const response = await api.get("/screen/latest", { responseType: "blob" });

    if (response.status === 204 || !response.data || response.data.size === 0) {
      return { hasImage: false, image: null, updatedAt: null };
    }

    const image = URL.createObjectURL(response.data as Blob);
    previousBlobUrl = image;
    const updatedAt = (response.headers["x-updated-at"] as string) || null;
    return { hasImage: true, image, updatedAt };
  }),
};
