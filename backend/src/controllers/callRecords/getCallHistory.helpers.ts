import type { CallHistoryQuery } from "../../services";

import type { ParsedQs } from "qs";

export const parseHistoryQuery = (
  query: ParsedQs
): CallHistoryQuery => {
  const limitRaw = query.limit;
  const cursorRaw = query.cursor;
  const limit =
    typeof limitRaw === "string" ? Number.parseInt(limitRaw, 10) : undefined;
  return {
    limit: limit && Number.isFinite(limit) ? limit : undefined,
    cursor: typeof cursorRaw === "string" ? cursorRaw : undefined,
  };
};
