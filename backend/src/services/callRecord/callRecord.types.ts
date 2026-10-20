import type { Prisma } from "@prisma/client";
import type { CALL_RECORD_WITH_PEER } from "./callRecord.constants";

export type CallHistoryQuery = {
  limit?: number;
};

export type CallRecordWithPeer = Prisma.CallRecordGetPayload<typeof CALL_RECORD_WITH_PEER>;
