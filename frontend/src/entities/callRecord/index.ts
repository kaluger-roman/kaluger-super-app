export * as callHistoryModel from "./model/callHistory.model";
export { getCallHistory } from "./api/callHistoryApi";
export type {
  CallHistoryRecord,
  CallHistoryResponse,
  CallHistoryDirection,
  CallHistoryStatus,
  CallHistoryPrincipal,
  CallHistoryDirection as CallDirection,
  CallHistoryStatus as CallStatus,
} from "./callRecord.types";
