import { formatDateTimeFull, pluralize } from "@shared";
import type { AdminAlert } from "@shared";

import { TIMES_FORMS } from "./AlertCard.constants";

export const formatLastSeen = ({ lastSeenAt, occurrences }: AdminAlert): string => {
  const time = formatDateTimeFull(lastSeenAt);
  return occurrences > 1 ? `${time}, повторялось ${pluralize(occurrences, TIMES_FORMS)}` : time;
};
