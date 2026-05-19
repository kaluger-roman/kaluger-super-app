import type { StudentAuthResponse } from "../../types";

export type RegisterResult =
  | { ok: true; data: StudentAuthResponse }
  | { ok: false; status: number; error: string };

export type LoginResult =
  | { ok: true; data: StudentAuthResponse }
  | { ok: false; status: number; error: string };
