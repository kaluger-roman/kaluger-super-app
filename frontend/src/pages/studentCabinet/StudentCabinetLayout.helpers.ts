import type { StartCallParams } from "@features";
import type { StudentSession } from "@shared";

import { TUTOR_FALLBACK_NAME } from "./StudentCabinetLayout.constants";

export const toTutorCallParams = (session: StudentSession | null): StartCallParams => ({
  peerName: session?.tutor?.name ?? TUTOR_FALLBACK_NAME,
});
